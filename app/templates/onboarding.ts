import { Duration } from "surrealdb";
import { IIdeaForm, ISafeIdea } from "../database/models/ideas";
import { ITaskForm } from "../database/models/task";
import { ISafeUser } from "../database/models/user";
import { ITagForm } from "../database/models/tag";

export const first: IIdeaForm = {
  title: "Your first idea!",
  embeddings: null,
  visibility: "private",
  content: `
    <p>This is your <em>first</em> idea!</p>
    <p>An idea in <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.noeko.app">Noeko</a> follows similar principles to other Markdown-based editors. You can<em> apply familiar formatting</em>, link to other ideas with “[[]]” syntax, and use “/” to insert content.</p>
    <p>Try typing “reference guide” in the center of the brackets: [[]]</p>
    <p>Try placing your cursor after the “/”:</p>
    <p>/</p>
    <p><span>select text to apply formatting</span>, connect ideas, or even create new ideas without leaving the editor.<em> Our biggest priority is your experience using Noeko,</em> so <strong>please don’t hesitate to give us feedback!</strong> (you will find a megaphone button in the left sidebar.)</p>
    <h1>Orientation</h1>
    <p><em>In the right sidebar</em>, you’ll see your search bar, <em>you can search with natural language</em>, or based on text! (Try searching for “My second idea”)</p>
    <p><em>In the left sidebar</em>, you’ll see relevant context about the idea you’re currently working in.</p>
    <p>You can <em>connect</em> ideas, either by dragging-and-dropping, or clicking on the idea to reveal a “Connect” button.</p>
    <h1>Video Tutorial</h1>
    <p>For a quick video tutorial on Noeko’s basic features, check this out:</p>
    <div data-dream-youtube-video="">
      <iframe src="https://www.youtube.com/embed/ndP8Sc2CGZw" data-start="0" frameborder="0" allowfullscreen="true" title="Embedded YouTube Video"></iframe>
    </div>
    `,
};

export const ideas: IIdeaForm[] = [
  {
    title: "Noeko’s Mission",
    visibility: "private",
    embeddings: null,
    content: `
    <p>
        <em
            >We will not be sad if you delete this note, it is here largely for
            introductory purposes. Happy thinking :)</em
        >
    </p>
    <p><strong>TLDR:&nbsp;</strong>Noeko’s mission is two-fold:</p>
    <ol>
        <li>
            <p>Make knowledge-management a frictionless process</p>
        </li>
        <li>
            <p>Help users get the most out of their thoughts</p>
        </li>
    </ol>
    <hr />
    <h2>The Problem</h2>
    <p>
        At Noeko, we are lovers of knowledge. The wealth of things to learn in the
        modern world is fascinating, the hidden insights and nuggets of gold waiting
        to be unearthed are the ultimate allure. How do we get the most out of that
        knowledge? Knowledge Management Systems seek to answer this question,
        providing organization strategies and tooling to let us capture thoughts,
        organize ideas, and hopefully find them later. However, while powerful,
        <strong>we found that these tools didn’t always make things better.</strong>
    </p>
    <p>
        We often found ourselves<strong> </strong
        ><em>spending more time organizing&nbsp;than actually thinking</em> about
        the ideas we had. If we created a powerful and expressive organization
        system, then it needed to be maintained. We want the organization to reflect
        how we thing, but
        <strong
            >the more structure we add, the more decisions need to be made.</strong
        >
        A new tag needs to be manually applied to everything that it relates to, a
        new note sorted into the right folder, and links made manually to ensure
        they’re meaningful. Once it’s time to use what we’ve stored, finding things
        means explicitly remembering key words, tags, or directory structure.
    </p>
    <p>
        <strong>The result of these problems?</strong> We don’t capture as much as
        we could, because it’s a pain to add new things to a complex system. We
        don’t gain serendipitous insights because it’s no fun to explore a messy and
        disjointed landscape. We can’t find what we’re looking for without
        remembering it explicitly, so storing it in the first place loses its
        meaning. The knowledge we aimed to utilize doesn’t become an asset, but
        rather a liability. Our thoughts are scattered, our information isn’t
        useful, and we’re not happy.
    </p>
    <p>This forces many to choose between:</p>
    <ol>
        <li>
            <p>A simple system without friction but lacking in power</p>
        </li>
        <li>
            <p>A powerful system that’s complex and a chore to maintain</p>
        </li>
    </ol>
    <p><strong>What if there was a better option?</strong></p>
    <hr />
    <h2>The Solution</h2>
    <p>
        We built Noeko to remove the friction from knowlege management, without
        making it less powerful. In fact, our mission is to make your knowledge more
        powerful than it’s ever been. We focus on making capture, structure, and
        retrieval not only frictionless but also deeply insightful by default.
    </p>
    <p>
        <strong>Capture should be simple, quick, and effective.</strong> Clicking a
        button, typing or speaking some words, and moving on should be enough to
        make a meaningful contribution to your knowledge. You shouldn’t have to find
        the right folder to place the new note in, leave or get distracted executing
        a whole process just to keep a note. So in Noeko, the structure is flat so
        that you never have to decide where to put things. You don’t have to worry
        about losing that short note, because it will come up again when it’s
        relevant.
    </p>
    <p>
        <strong>Structure should be expressive, powerful, and painless.</strong
        >&nbsp;Your knowledge base should reflect how your mind works, but this
        shouldn’t have to mean taking cognitive residue when you’re trying to
        think.&nbsp;That’s why in Noeko, tags are smart and know where they should
        be applied. Rabbitholes are a workspace for deep dives that capture
        everything in your flow. Structure emerges naturally as you use Noeko, and
        organization decisions are 90% easier–the remaining 10% is the control that
        you keep over the structure.
    </p>
    <p>
        <strong>Retrieval should be insightful, accurate, and easy.</strong>&nbsp;If
        you have something stored, you should be able to find it later on. Can’t
        remember a keyword? What was that tag again? Do I have anything stored
        related to this concept? In Noeko, you can search with natural language, so
        queries like “that note I had about working memory” will find you what
        you’re looking for. Relevant context will automatically resurface when it’s
        relevant, so the things you store always have a chance to make their
        contribution. Spyglass can search, analyze, and provide you
        with&nbsp;<em>accurate</em>&nbsp;and<em> source-grounded</em>&nbsp;answers
        to your questions, always rooted directly in what you have stored.
    </p>
    <hr />
    <p>
        <strong>Therefore, we work every day towards the mission</strong> of
        eliminating the friction in your workflow, and making your knowledge more
        powerful. If you have any suggestions on how we could do that better, please
        let us know:
    </p>
    <ul>
        <li>
            <p>
                Contact us directly at
                <a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    href="mailto:feedback@noeko.app"
                    >feedback@noeko.app</a
                >
            </p>
        </li>
        <li>
            <p>
                Join the
                <a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    href="https://discord.gg/TY9sna9ZbT"
                    >Discord</a
                >
                community and start a discussion
            </p>
        </li>
        <li>
            <p>
                Join the
                <a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    href="https://reddit.com/r/noeko"
                    >Subreddit</a
                >&nbsp;and&nbsp;make&nbsp;a&nbsp;post
            </p>
        </li>
    </ul>
    `,
  },
  {
    title: "Reference Manual",
    visibility: "private",
    embeddings: null,
    content: `
    <p>
        This is a simple reference guide for some concepts you’ll want to be
        familiar with. For a more comprehensive documentation, check out the
        <a
            target="_blank"
            rel="noopener noreferrer nofollow"
            href="https://docs.noeko.app"
            >Official Noeko Documentation</a
        >.
    </p>
    <hr />
    <h1>What is an Idea? 💡</h1>
    <p>
        <a
            target="_blank"
            rel="noopener noreferrer nofollow"
            href="https://docs.noeko.app/concepts/ideas/"
            ><em>Documentation</em></a
        >
    </p>
    <p>
        In Noeko, an <strong>Idea</strong> is the fundamental building block of your
        knowledge base. Think of it as a digital note or a single unit of
        information, whether it’s a fleeting thought, a detailed project plan, or a
        quote you want to remember. Each Idea is a distinct entry that can be linked
        to others, forming a network of interconnected knowledge. This allows you to
        not only store information but also to map out the relationships between
        different concepts, creating a personal knowledge graph that reflects your
        unique way of thinking.
    </p>
    <p>
        With Ideas, you can perform several key actions to build and manage your
        knowledge:
    </p>
    <ul>
        <li>
            <p>
                <strong>Capture:</strong> Create an Idea to capture any piece of
                information, from a simple note to a detailed document.
            </p>
        </li>
        <li>
            <p>
                <strong>Organize:</strong> Use
                <a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    href="https://docs.noeko.app/reference/tags"
                    >tags</a
                >
                to categorize your Ideas and group them by topic or project.
            </p>
        </li>
        <li>
            <p>
                <strong>Find:</strong> Instantly find any Idea with
                <a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    href="https://docs.noeko.app/reference/spyglass"
                    >Spyglass Search</a
                >, which supports advanced filtering and sorting.
            </p>
        </li>
        <li>
            <p>
                <strong>Manage:</strong> Structure your Ideas into hierarchical
                outlines and workflows with
                <a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    href="https://docs.noeko.app/reference/rabbithole"
                    >Rabbithole</a
                >.
            </p>
        </li>
        <li>
            <p>
                <strong>Connect:</strong> Link related Ideas to build a
                <a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    href="https://docs.noeko.app/reference/constellation"
                    >Constellation</a
                >
                and visualize the connections between your thoughts.
            </p>
        </li>
    </ul>
    <p><strong>Creating Your First Idea</strong></p>
    <ul>
        <li>
            <p>
                You can use command palette to create a new idea by pressing
                <code>Ctrl + K</code> or <code>Cmd + K</code> and then typing
                <code>New Idea</code>.
            </p>
        </li>
        <li>
            <p>
                Compose your idea using the built-in markdown editor inside Noeko.
            </p>
        </li>
        <li>
            <p>
                Your ideas are automatically saved as you type, so you never have to
                worry about losing your work.
            </p>
        </li>
        <li>
            <p>
                Link your current idea to relevant existing ideas via the sidebar.
                Noeko surfaces similar content, facilitating a more interconnected
                knowledge base.
            </p>
        </li>
        <li>
            <p>
                Connected ideas should appear instantly in the
                <a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    href="https://docs.noeko.app/concepts/constellation/"
                    >Constellation</a
                >.
            </p>
        </li>
    </ul>
    <hr />
    <h1>The Constellation 🌌</h1>
    <p>
        <a
            target="_blank"
            rel="noopener noreferrer nofollow"
            href="https://docs.noeko.app/concepts/constellation/"
            ><em>Documentation</em></a
        >
    </p>
    <p>
        The Constellation is the central structure in Noeko that connects all your
        individual pieces of knowledge, represented as
        <a
            target="_blank"
            rel="noopener noreferrer nofollow"
            href="https://docs.noeko.app/concepts/ideas"
            >Ideas</a
        >
        and
        <a
            target="_blank"
            rel="noopener noreferrer nofollow"
            href="https://docs.noeko.app/concepts/nodes/"
            >Nodes</a
        >. It provides a visual representation of how your thoughts and concepts are
        related. The Constellation is a dynamic network where each
        <a
            target="_blank"
            rel="noopener noreferrer nofollow"
            href="https://docs.noeko.app/reference/ideas"
            >Idea</a
        >
        you create becomes a node, and the links you establish between Ideas form
        the connections (edges) in the graph. This structure allows you to see the
        relationships between different pieces of information at a glance.
    </p>
    <p>The Constellation serves several key purposes in Noeko:</p>
    <ul>
        <li>
            <p>
                <strong>Visualization:</strong> Provides a clear visual overview of
                your entire knowledge base and the connections within it.
            </p>
        </li>
        <li>
            <p>
                <strong>Discovery:</strong> Helps you discover relationships between
                seemingly unrelated Ideas, fostering new insights.
            </p>
        </li>
        <li>
            <p>
                <strong>Navigation:</strong> Allows you to navigate your knowledge
                by following connections between Ideas.
            </p>
        </li>
        <li>
            <p>
                <strong>Context:</strong> Shows the context of any given Idea by
                displaying its connections to other parts of your knowledge.
            </p>
        </li>
    </ul>
    <hr />
    <h1>Smart Tags 🏷️ 🧠</h1>
    <p>
        <a
            target="_blank"
            rel="noopener noreferrer nofollow"
            href="https://docs.noeko.app/concepts/tags/"
            ><em>Documentation</em></a
        >
    </p>
    <p>
        In Noeko, tags are like smart, flexible labels you can attach to any piece
        of content—your notes, ideas, or sources. Unlike traditional folders that
        force you to pick just one place for an item, tags let you categorize your
        content in many different ways at once.
    </p>
    <p>
        Think of them as highly customizable organizers for your knowledge. You can
        use tags to group information by:
    </p>
    <ul>
        <li>
            <p>
                <strong>Subjects:</strong>
                <code>#history</code>,
                <code>#science</code>
                <code>#philosophy</code>,
            </p>
        </li>
        <li>
            <p>
                <strong>Projects:</strong>
                <code>#phoenix-project</code>, <code>#website-redesign</code>,
                <code>#q4-launch</code>
            </p>
        </li>
        <li>
            <p>
                <strong>Specific Topics:</strong>
                <code>#neural-networks</code>, <code>#quantum-computing</code>,
                <code>#user-behavior</code>
            </p>
        </li>
        <li>
            <p>
                <strong>Contexts:</strong>
                <code>#todo</code>, <code>#meeting-notes</code>,
                <code>#research</code>
            </p>
        </li>
    </ul>
    <p></p>
    <p>
        Our <strong>Smart Tagging</strong> feature leverages Noeko’s understanding
        of your notes’ content to offer highly relevant tag suggestions
        automatically.
    </p>
    <p>Here’s how it works:</p>
    <ol>
        <li>
            <p>
                As you write or import notes, Noeko reads and understands the
                context of your content.
            </p>
        </li>
        <li>
            <p>
                Based on this understanding, Noeko will present a few tag
                suggestions that are most relevant to what you’ve written. These
                suggestions appear discreetly, often near your note’s content or in
                a dedicated suggestions area.
            </p>
        </li>
        <li>
            <p>
                <strong>To add a suggested tag</strong>, simply click the
                <code>+</code><strong> (plus sign)</strong> next to it.
            </p>
        </li>
        <li>
            <p>
                Once you click, the tag is instantly applied to your note, and the
                <code>+</code> sign will magically transform into an <code>x</code
                ><strong> (cross)</strong>. This <code>x</code> indicates that the
                tag has been added, and you can click it again to remove the tag if
                you change your mind.
            </p>
        </li>
    </ol>
    <hr />
    <h1>Spotlight 🔦</h1>
    <p>
        The Spotlight Search provides a quick and efficient way to navigate Noeko,
        similar to the Spotlight feature on macOS. You can use it to:
    </p>
    <ul>
        <li>
            <p>
                <strong>Find Notes:</strong> Quickly search for any note by its
                title or content.
            </p>
        </li>
        <li>
            <p>
                <strong>Execute Commands:</strong> Access various application
                commands without using the mouse.
            </p>
        </li>
    </ul>
    <p></p>
    <p><strong>How to Use</strong></p>
    <ol>
        <li>
            <p>
                <strong>Open Spotlight Search:</strong> Press
                <code>Ctrl+K</code> (Windows/Linux) or <code>Cmd+K</code> (macOS)
                from anywhere in the application.
            </p>
        </li>
        <li>
            <p>
                <strong>Type Your Query:</strong> Start typing to search for notes
                or commands. The results will appear dynamically as you type.
            </p>
        </li>
        <li>
            <p>
                <strong>Navigate Results:</strong> Use the up and down arrow keys to
                move through the search results.
            </p>
        </li>
        <li>
            <p>
                <strong>Select an Item:</strong> Press <code>Enter</code> to open
                the selected note or execute the selected command.
            </p>
        </li>
    </ol>
    <p></p>
    <hr />
    <h1>Spyglass 🔎 🧠</h1>
    <p>
        Spyglass is an agentic search feature, allowing you to
        <strong>query your knowledge base</strong> with natural language, and
        analyze your thoughts. When you send Spyglass a query, it will search
        everything you have saved, analyze it for relevant information, and then
        present a source-grounded summary of its findings.
    </p>
    <p>
        <strong>Answers are always grounded</strong> in only the information you
        have saved, and every statement includes a direct citation to excerpts from
        your saved stuff allowing for traceability.
        <strong>This makes Spyglass your personal answer engine.</strong> Let’s
        briefly touch on some different ways to use Spyglass effectively.
    </p>
    <ul>
        <li>
            <p>
                <strong>Finding things:&nbsp;</strong>whether it be a note you can’t
                remember the name of, or a vague idea you had on a certain
                topic,&nbsp;Spyglass can help you find what you’re looking for
            </p>
        </li>
    </ul>
    <ul>
        <li>
            <p>
                <strong>Research and Recall:</strong>&nbsp;compile all of the
                thoughts that you have on a certain topic or supporting a specific
                argument
            </p>
        </li>
        <li>
            <p>
                <strong>Analysis and Insight:</strong> automatically review a
                specific dataset to glean relevant information from your source
                material to surface patterns and connections
            </p>
        </li>
        <li>
            <p>
                <strong>Journal Reflection:</strong> ask time-bound queries
                like&nbsp;“summarize my ideas from this month” to reflect on what’s
                important
            </p>
        </li>
        <li>
            <p>
                <strong>Other Things:</strong>&nbsp;we would love to hear how
                <em>you</em>&nbsp;would make use of Spyglass so that we can improve
                Noeko accordingly :)
            </p>
        </li>
    </ul>
    <p></p>
    <hr />
    <h1>Feedback 📣, Support 🛟&nbsp; &amp; Community 🌍</h1>
    <p>
        We would love to hear from you! We strive to make continual improvements to
        Noeko, and we can’t do that without feedback from the community.
    </p>
    <p>Here are some ways that you can <strong>give us input:</strong></p>
    <ul>
        <li>
            <p>
                Email us directly at&nbsp;<a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    href="mailto:feedback@noeko.app"
                    >feedback@noeko.app</a
                >
            </p>
        </li>
        <li>
            <p>
                Start a discussion in the
                <a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    href="https://discord.gg/TY9sna9ZbT"
                    >Discord Community</a
                >
            </p>
        </li>
        <li>
            <p>
                Make a post in
                <a
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    href="https://reddit.com/r/noeko"
                    >The Subreddit</a
                >
            </p>
        </li>
        <li>
            <p>Hit the button! There is a Feedback (📣) button in the app.</p>
        </li>
    </ul>
    <p>
        If you encounter any problems in the app, email us at&nbsp;<a
            target="_blank"
            rel="noopener noreferrer nofollow"
            href="mailto:support@noeko.app"
            >support@noeko.app</a
        >&nbsp;for help!
    </p>
    <p></p>

    `,
  },
];

export const tasks: ITaskForm[] = [
  {
    description: "Import your stuff",
    scratchpad: `
    <p>Did you know that you can import your stuff?</p>
    <p>Simply go to Settings -> Data Controls -> "Import Ideas" to get started!</p>
    `,
    dueDate: null,
    estimatedTime: new Duration("15m"),
    completedAt: null,
  },
  {
    description: "Add an idea",
    scratchpad: `
    <p>Your notes in Noeko are called "ideas"</p>
    <p>You can create an idea in 3 different ways:</p>
    <ul>
      <li>
        <strong>Buttons:</strong> there are various “+” buttons that let you add ideas
      </li>
      <li>
        <strong>Spotlight:</strong> press <code>CMD/CTRL + k</code> to activate the Spotlight, then find "New Idea"
      </li>
      <li>
        <strong>Shortcut:</strong> press <code>CMD/CTRL + Shift + I</code> to create a new idea instantly
      </li>
    </ul>
    `,
    dueDate: null,
    estimatedTime: new Duration("15m"),
    completedAt: null,
  },
  {
    description: "Ask Spyglass a question",
    estimatedTime: new Duration("15m"),
    dueDate: null,
    completedAt: null,
    scratchpad: `
    <p>Use Spyglass to ask your saved knowledge anything!</p>
    <p>Learn more about Spyglass <a href="https://docs.noeko.app/concepts/spyglass/">here!</a></p>
    `,
  },
  {
    description: "Go down a Rabbithole!",
    estimatedTime: new Duration("15m"),
    dueDate: null,
    completedAt: null,
    scratchpad: `
    <p>Try creating then entering a Rabbithole</p>
    `,
  },
  {
    description: "Leave us some feedback!",
    scratchpad: `
    <p>We'd love to hear your thoughts on how we can improve Noeko!</p>
    `,
    dueDate: null,
    estimatedTime: new Duration("15m"),
    completedAt: null,
  },
];

export const tags: ITagForm[] = [
  {
    name: "Noeko/Getting Started",
    description:
      "Everything related to getting started with your Noeko knowledge-base.",
  },
  {
    name: "Noeko/Mission",
    description:
      "Everything related to the mission of Noeko, bringing clarity to scattered thoughts.",
  },
];
