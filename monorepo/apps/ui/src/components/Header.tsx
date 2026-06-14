import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { Moon, Search, Sun, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "./ui/input";

type HeaderProps = {
  searchText: string;
  onSearchTextChange: (value: string) => void;
};

const Header = ({ searchText, onSearchTextChange }: HeaderProps) => {
  const { dark, setDark } = useTheme();
  const { isLoggedIn, login, logout } = useAuth();

  return (
    <header className="w-full max-w-5xl mx-auto flex items-center gap-1 px-4 py-3">
      <Button asChild variant="ghost">
        <Link to="/">Home</Link>
      </Button>
      {isLoggedIn && (
        <>
          <Button asChild variant="ghost">
            <Link to="/upload">Upload</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/profile">Profile</Link>
          </Button>
        </>
      )}
      <div className="relative ml-2 max-w-sm flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search artwork"
          className="pl-9"
          placeholder="Search artwork"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
        />
      </div>
      <Button
        className="ml-auto"
        variant="ghost"
        size="icon"
        onClick={() => {
          setDark(!dark);
        }}
      >
        {dark ? <Sun /> : <Moon />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <User />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
          {isLoggedIn ? (
            <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={login}>Login</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default Header;
