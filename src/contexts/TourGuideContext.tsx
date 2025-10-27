import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { markFeatureViewed, getAllViewed } from "../utils/tourguide";

export interface IOnboardingStep {
  id: string;
  view: string;
  order: number;
  title: string;
  content: React.ReactNode;
}

type IRegisteredStep = IOnboardingStep & {
  element: HTMLElement;
};

interface ITourGuideContext {
  currentStep: IRegisteredStep | null;
  targetElement: HTMLElement | null;
  isLoading: boolean;
  viewedFeatures: Set<string>;
  completeStep: (stepId: string) => void;
  skipTour: (viewId: string) => void;
  registerStep: (step: IOnboardingStep, element: HTMLElement) => void;
  deregisterStep: (stepId: string) => void;
}

const TourGuideContext = createContext<ITourGuideContext | undefined>(
  undefined,
);

export const TourGuideProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [currentStep, setCurrentStep] = useState<IRegisteredStep | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const [registeredSteps, setRegisteredSteps] = useState(
    new Map<string, IRegisteredStep>(),
  );

  const [viewedFeatures, setViewedFeatures] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  console.log("Viewed features: ", viewedFeatures);

  useEffect(() => {
    getAllViewed()
      .then((viewedIds) => {
        setViewedFeatures(new Set(viewedIds));
      })
      .catch((err) => {
        console.error("Failed to get viewed features:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const unseenSteps = Array.from(registeredSteps.values()).filter(
      (step) => !viewedFeatures.has(step.id),
    );

    if (unseenSteps.length === 0) {
      setCurrentStep(null);
      setTargetElement(null);
      return;
    }

    unseenSteps.sort((a, b) => a.order - b.order);
    const nextStep = unseenSteps[0];

    if (nextStep) {
      setCurrentStep(nextStep);
      setTargetElement(nextStep.element);
      nextStep.element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [registeredSteps, viewedFeatures, isLoading]);

  const registerStep = useCallback(
    (step: IOnboardingStep, element: HTMLElement) => {
      setRegisteredSteps((prev) =>
        new Map(prev).set(step.id, { ...step, element }),
      );
    },
    [],
  );

  const deregisterStep = useCallback((stepId: string) => {
    setRegisteredSteps((prev) => {
      const next = new Map(prev);
      next.delete(stepId);
      return next;
    });
  }, []);

  const completeStep = (stepId: string) => {
    setViewedFeatures((prev) => new Set(prev).add(stepId));

    markFeatureViewed(stepId).catch((err) => {
      console.error(`Failed to mark feature ${stepId} as viewed:`, err);
      setViewedFeatures((prev) => {
        const next = new Set(prev);
        next.delete(stepId);
        return next;
      });
    });
  };

  const skipTour = (viewId: string) => {
    const stepsToSkip: string[] = [];

    registeredSteps.forEach((step) => {
      if (step.view === viewId && !viewedFeatures.has(step.id)) {
        stepsToSkip.push(step.id);
      }
    });

    if (stepsToSkip.length === 0) return;

    setViewedFeatures((prev) => new Set([...prev, ...stepsToSkip]));

    Promise.all(stepsToSkip.map(markFeatureViewed)).catch((err) => {
      console.error(`Failed to skip tour for view ${viewId}:`, err);
      setViewedFeatures((prev) => {
        const next = new Set(prev);
        stepsToSkip.forEach((id) => next.delete(id));
        return next;
      });
    });
  };

  const value = useMemo(
    () => ({
      currentStep,
      targetElement,
      isLoading,
      viewedFeatures,
      completeStep,
      skipTour,
      registerStep,
      deregisterStep,
    }),
    [
      currentStep,
      targetElement,
      isLoading,
      viewedFeatures,
      registerStep,
      deregisterStep,
    ],
  );

  return (
    <TourGuideContext.Provider value={value}>
      {children}
    </TourGuideContext.Provider>
  );
};

export const useTourGuide = () => {
  const context = useContext(TourGuideContext);
  if (context === undefined) {
    throw new Error("useTourGuide must be used within a TourGuideProvider");
  }
  return context;
};

export const useTourStep = (step: IOnboardingStep) => {
  const ref = useRef<any>(null);
  const { registerStep, deregisterStep, isLoading, viewedFeatures } =
    useTourGuide();
  const { id, view, order, title, content } = step;

  useEffect(() => {
    if (!ref.current || isLoading || viewedFeatures.has(id)) {
      return;
    }

    registerStep({ id, view, order, title, content }, ref.current);

    return () => {
      deregisterStep(id);
    };
  }, [id, registerStep, deregisterStep, isLoading, viewedFeatures]);

  return ref;
};
