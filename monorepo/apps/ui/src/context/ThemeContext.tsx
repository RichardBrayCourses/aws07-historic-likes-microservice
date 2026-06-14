import {
  useState,
  createContext,
  useContext,
  ReactNode,
  Dispatch,
  SetStateAction,
  useEffect,
} from "react";

/////////////
// CONTEXT
/////////////

interface ThemeContextData {
  dark: boolean;
}
interface ThemeContextValue extends ThemeContextData {
  setDark: Dispatch<SetStateAction<boolean>>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/////////////
// HELPER
/////////////

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within <ThemeProvider>");
  return value;
}

////////////////////////
// LOAD / SAVE CONTEXT
////////////////////////

function saveContext(contextData: ThemeContextData) {
  localStorage.setItem("dark", contextData.dark ? "true" : "false");
}

function loadContext(): ThemeContextData {
  const dark = localStorage.getItem("dark") === "true";
  return { dark };
}

/////////////
// PROVIDER
/////////////

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [dark, setDark] = useState(loadContext().dark);

  useEffect(() => {
    saveContext({ dark });
  }, [dark]);

  const sharedData = { dark, setDark };

  return (
    <ThemeContext.Provider value={sharedData}>{children}</ThemeContext.Provider>
  );
};

export default ThemeProvider;
