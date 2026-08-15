import { createContext, useContext, useEffect, useRef } from "react";

export const LandsGuideContext = createContext(null);

export function useLandsGuide(onGuide) {
  const setGuideAction = useContext(LandsGuideContext);
  const guideRef = useRef(onGuide);
  guideRef.current = onGuide;

  useEffect(() => {
    if (!setGuideAction) return undefined;

    const action = () => guideRef.current?.();
    setGuideAction(() => action);

    return () => {
      setGuideAction((current) => (current === action ? null : current));
    };
  }, [setGuideAction]);
}
