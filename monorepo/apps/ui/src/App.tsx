import { Route, Routes, BrowserRouter } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ThemeProvider, { useTheme } from "./context/ThemeContext";
import AuthProvider from "./context/AuthContext";
import Upload from "./pages/Upload";
import Callback from "./pages/Callback";
import { useState } from "react";

const AppContent = () => {
  const { dark } = useTheme();
  const [searchText, setSearchText] = useState("");
  document.documentElement.classList.toggle("dark", dark);
  return (
    <div className="h-screen flex flex-col">
      <Header searchText={searchText} onSearchTextChange={setSearchText} />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Home searchText={searchText} />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
