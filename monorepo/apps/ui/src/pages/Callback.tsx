import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Callback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { completeOAuthCallback } = useAuth();
  const hasProcessed = useRef(false);
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    if (hasProcessed.current) return;

    const code = params.get("code");
    const state = params.get("state");
    const errorParam = params.get("error");
    const errorDescription = params.get("error_description");

    if (errorParam) {
      setMessage(errorDescription ?? errorParam);
      return;
    }

    if (!code || !state) {
      setMessage("Missing authorization code or state");
      return;
    }

    hasProcessed.current = true;
    const authorizationCode = code;
    const oauthState = state;

    async function finishLogin() {
      try {
        await completeOAuthCallback(authorizationCode, oauthState);
        navigate("/profile", { replace: true });
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to complete authentication",
        );
      }
    }

    finishLogin();
  }, [params, navigate, completeOAuthCallback]);

  return <p className="max-w-5xl mx-auto p-4 pt-0">{message}</p>;
};

export default Callback;
