import { Router } from "express";
import type { ISafeUser } from "../../shared/types/user";
import type {
  IOrganizationForm,
  IOrganizationMembershipStatus,
  IOrganizationRole,
} from "../../shared/types/organization";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { addAccessTokenToRes, addRefreshTokenToRes, getFromReq } from "../utils/requests";
import { Organization } from "../database/models/organization";
import Authorization from "../services/Authorization";
import { initialSettings, User } from "../database/models/user";
import { hashPassword } from "../utils/crypto";

const router = Router();

const organizationError = (error: unknown) => {
  const code = error instanceof Error ? error.message : "";
  if (code === "ORGANIZATION_OWNER_REQUIRED") {
    return { status: 403, message: "Only organization owners can do that." };
  }
  if (code === "LAST_ORGANIZATION_OWNER") {
    return { status: 409, message: "An organization must have at least one active owner." };
  }
  if (code === "ORGANIZATION_ALREADY_MEMBER") {
    return { status: 409, message: "That account is already a member." };
  }
  if (code === "ORGANIZATION_INVITATION_EXISTS") {
    return { status: 409, message: "A pending invitation already exists for that email." };
  }
  if (code === "INVITATION_EXPIRED") {
    return { status: 410, message: "This invitation has expired. Ask an owner to resend it." };
  }
  if (code === "INVITATION_EMAIL_MISMATCH") {
    return { status: 403, message: "This invitation belongs to a different email address." };
  }
  if (
    code === "INVITATION_INVALID" ||
    code === "INVITATION_NOT_RESENDABLE" ||
    code === "INVITATION_NOT_REVOCABLE" ||
    code === "ORGANIZATION_MEMBER_NOT_FOUND"
  ) {
    return { status: 404, message: "That invitation or member could not be found." };
  }
  return undefined;
};

router.get("/invitations/:token", async (req, res) => {
  try {
    const token = req.params.token;
    if (Array.isArray(token)) {
      res.status(400).json({ message: "Invalid invitation token." });
      return;
    }
    const invitation = await Organization.previewInvitation(token);
    res.json({ message: "Invitation retrieved successfully.", data: invitation });
  } catch (error) {
    const mapped = organizationError(error);
    if (mapped) {
      res.status(mapped.status).json({ message: mapped.message });
      return;
    }
    console.error("Error previewing organization invitation:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/invitations/:token/register", async (req, res) => {
  let newUserId: string | undefined;
  try {
    const token = req.params.token;
    const form = req.body;
    if (Array.isArray(token)) {
      res.status(400).json({ message: "Invalid invitation token." });
      return;
    }
    if (
      !form.email ||
      !form.password ||
      !form.passwordConfirmation ||
      !form.firstName ||
      !form.lastName
    ) {
      res.status(400).json({ message: "All registration fields are required." });
      return;
    }
    if (form.password !== form.passwordConfirmation || form.password.length < 6) {
      res.status(422).json({ message: "Passwords must match and contain at least 6 characters." });
      return;
    }
    const invitation = await Organization.previewInvitation(token);
    const email = Organization.normalizeEmail(form.email);
    if (email !== invitation.email) {
      res.status(403).json({ message: "This invitation belongs to a different email address." });
      return;
    }
    if (await User.findByEmail(email)) {
      res
        .status(409)
        .json({ message: "An account already exists. Sign in to accept the invitation." });
      return;
    }

    const newUser = await User.create({
      email,
      password: await hashPassword(form.password),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      scratchpadContent: "",
      acceptedPrivacyPolicyAt: new Date(),
      acceptedTermsOfServiceAt: new Date(),
      settings: initialSettings,
    });
    if (!newUser) throw new Error("USER_CREATION_FAILED");
    newUserId = newUser.id.toString();
    await User.loadOnboarding(newUser.id.toString());
    const publicUser = User.filterPublicFields(newUser);
    const accessToken = await User.generateAccessToken(publicUser);
    const refreshToken = await User.generateRefreshToken(publicUser);
    if (!refreshToken) throw new Error("TOKEN_CREATION_FAILED");
    const organization = await Organization.acceptInvitation(token, newUser.id);
    await addAccessTokenToRes(res, accessToken);
    await addRefreshTokenToRes(res, refreshToken);
    res.status(201).json({
      message: `Your account was created and you joined ${organization?.name}.`,
      data: { accessToken, user: newUser, organization },
    });
  } catch (error) {
    if (newUserId) await User.delete(newUserId);
    const mapped = organizationError(error);
    if (mapped) {
      res.status(mapped.status).json({ message: mapped.message });
      return;
    }
    console.error("Error registering through organization invitation:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.use(checkToken);
router.use(disallowDisabled);

router.post("/invitations/:token/accept", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const token = req.params.token;
    if (!user || Array.isArray(token)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.acceptInvitation(token, user.id);
    res.json({ message: `You joined ${organization?.name}.`, data: organization });
  } catch (error) {
    const mapped = organizationError(error);
    if (mapped) {
      res.status(mapped.status).json({ message: mapped.message });
      return;
    }
    console.error("Error accepting organization invitation:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organizations = await Organization.listForUser(user.id);
    res.json({ message: "Successfully retrieved organizations.", data: organizations });
  } catch (error) {
    console.error("Error listing organizations:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const form = req.body as Partial<IOrganizationForm>;
    if (!form.name?.trim() || !form.slug?.trim()) {
      res.status(400).json({ message: "Name and slug are required." });
      return;
    }
    const organization = await Organization.create(user.id, {
      name: form.name,
      slug: form.slug,
      description: form.description,
    });
    res.status(201).json({ message: "Organization created successfully.", data: organization });
  } catch (error) {
    if (error instanceof Error && error.message === "ORGANIZATION_SLUG_TAKEN") {
      res.status(409).json({ message: "That organization slug is already in use." });
      return;
    }
    if (error instanceof Error && error.message === "INVALID_ORGANIZATION_SLUG") {
      res.status(422).json({ message: "Organization slug is invalid." });
      return;
    }
    console.error("Error creating organization:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/resources/:resourceId/owner", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const resourceId = req.params.resourceId;
    if (!user || Array.isArray(resourceId)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const auth = new Authorization(user.id);
    if (!(await auth.hasAccess(resourceId))) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    const owner = await Organization.getResourceOwner(resourceId);
    if (!owner) {
      res.status(404).json({ message: "Resource owner not found." });
      return;
    }
    res.json({ message: "Successfully retrieved resource owner.", data: owner });
  } catch (error) {
    console.error("Error getting resource owner:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const slug = req.params.slug;
    if (!user || Array.isArray(slug)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    const membership = await Organization.getMembership(user.id, organization.id);
    if (!membership || membership.status !== "active") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    res.json({
      message: "Successfully retrieved organization.",
      data: {
        ...organization,
        membership: { role: membership.role, status: membership.status },
      },
    });
  } catch (error) {
    console.error("Error getting organization:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:slug/members", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const slug = req.params.slug;
    if (!user || Array.isArray(slug)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    const membership = await Organization.getMembership(user.id, organization.id);
    if (!membership || membership.status !== "active") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    const members = await Organization.getMembers(organization.id);
    res.json({ message: "Successfully retrieved organization members.", data: members });
  } catch (error) {
    console.error("Error getting organization members:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.patch("/:slug/members/:userId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const { slug, userId } = req.params;
    if (!user || Array.isArray(slug) || Array.isArray(userId)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    const role = req.body.role as IOrganizationRole | undefined;
    const status = req.body.status as IOrganizationMembershipStatus | undefined;
    if (
      (role && !["owner", "member"].includes(role)) ||
      (status && !["active", "suspended"].includes(status))
    ) {
      res.status(422).json({ message: "Invalid member role or status." });
      return;
    }
    const membership = await Organization.updateMember(organization.id, user.id, userId, {
      role,
      status,
    });
    res.json({ message: "Organization member updated.", data: membership });
  } catch (error) {
    const mapped = organizationError(error);
    if (mapped) {
      res.status(mapped.status).json({ message: mapped.message });
      return;
    }
    console.error("Error updating organization member:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/:slug/members/:userId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const { slug, userId } = req.params;
    if (!user || Array.isArray(slug) || Array.isArray(userId)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    await Organization.removeMember(organization.id, user.id, userId);
    res.json({ message: "Organization member removed." });
  } catch (error) {
    const mapped = organizationError(error);
    if (mapped) {
      res.status(mapped.status).json({ message: mapped.message });
      return;
    }
    console.error("Error removing organization member:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/:slug/leave", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const slug = req.params.slug;
    if (!user || Array.isArray(slug)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    await Organization.leave(organization.id, user.id);
    res.json({ message: `You left ${organization.name}.` });
  } catch (error) {
    const mapped = organizationError(error);
    if (mapped) {
      res.status(mapped.status).json({ message: mapped.message });
      return;
    }
    console.error("Error leaving organization:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:slug/invitations", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const slug = req.params.slug;
    if (!user || Array.isArray(slug)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    const invitations = await Organization.listInvitations(organization.id, user.id);
    res.json({ message: "Organization invitations retrieved.", data: invitations });
  } catch (error) {
    const mapped = organizationError(error);
    if (mapped) {
      res.status(mapped.status).json({ message: mapped.message });
      return;
    }
    console.error("Error listing organization invitations:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/:slug/invitations", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const slug = req.params.slug;
    const email = typeof req.body.email === "string" ? req.body.email : "";
    if (!user || Array.isArray(slug)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      res.status(422).json({ message: "Enter a valid email address." });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    const result = await Organization.createInvitation(organization.id, user.id, email);
    res.status(201).json({
      message: result.emailSent
        ? "Invitation sent."
        : "Invitation created, but the email could not be sent.",
      data: result.invitation,
    });
  } catch (error) {
    const mapped = organizationError(error);
    if (mapped) {
      res.status(mapped.status).json({ message: mapped.message });
      return;
    }
    console.error("Error creating organization invitation:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/:slug/invitations/:invitationId/resend", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const { slug, invitationId } = req.params;
    if (!user || Array.isArray(slug) || Array.isArray(invitationId)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    const result = await Organization.resendInvitation(organization.id, user.id, invitationId);
    res.json({
      message: result.emailSent
        ? "Invitation resent."
        : "Invitation renewed, but email delivery failed.",
      data: result.invitation,
    });
  } catch (error) {
    const mapped = organizationError(error);
    if (mapped) {
      res.status(mapped.status).json({ message: mapped.message });
      return;
    }
    console.error("Error resending organization invitation:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/:slug/invitations/:invitationId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const { slug, invitationId } = req.params;
    if (!user || Array.isArray(slug) || Array.isArray(invitationId)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    await Organization.revokeInvitation(organization.id, user.id, invitationId);
    res.json({ message: "Invitation revoked." });
  } catch (error) {
    const mapped = organizationError(error);
    if (mapped) {
      res.status(mapped.status).json({ message: mapped.message });
      return;
    }
    console.error("Error revoking organization invitation:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:slug/ideas", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const slug = req.params.slug;
    if (!user || Array.isArray(slug)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    const ideas = await Organization.getIdeas(organization.id, user.id);
    res.json({ message: "Successfully retrieved organization ideas.", data: ideas });
  } catch (error) {
    if (error instanceof Error && error.message === "ORGANIZATION_MEMBERSHIP_REQUIRED") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    console.error("Error getting organization ideas:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/:slug/ideas", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const slug = req.params.slug;
    if (!user || Array.isArray(slug)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    const idea = await Organization.createIdea(organization.id, user.id, {
      title: req.body.title?.trim() || "Untitled Idea",
      content: req.body.content || "",
    });
    if (!idea) {
      res.status(500).json({ message: "Idea could not be created." });
      return;
    }
    res.status(201).json({ message: "Organization idea created successfully.", data: idea });
  } catch (error) {
    if (error instanceof Error && error.message === "ORGANIZATION_MEMBERSHIP_REQUIRED") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    console.error("Error creating organization idea:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/:slug/ideas/:ideaId/transfer", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const slug = req.params.slug;
    const ideaId = req.params.ideaId;
    if (!user || Array.isArray(slug) || Array.isArray(ideaId)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const organization = await Organization.getBySlug(slug);
    if (!organization) {
      res.status(404).json({ message: "Organization not found." });
      return;
    }
    const idea = await Organization.transferIdea(organization.id, user.id, ideaId);
    res.json({ message: "Idea ownership transferred successfully.", data: idea });
  } catch (error) {
    if (error instanceof Error && error.message === "ORGANIZATION_MEMBERSHIP_REQUIRED") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    if (error instanceof Error && error.message === "PERSONAL_OWNERSHIP_REQUIRED") {
      res.status(403).json({ message: "Only the personal owner can transfer this idea." });
      return;
    }
    console.error("Error transferring idea ownership:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
