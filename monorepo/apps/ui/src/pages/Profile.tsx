import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserProfile, updateNickname } from "@/services/photosService";
import type { UserProfile } from "@/types";

const Profile = () => {
  const { user, isLoggedIn } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;

    setLoading(true);
    getUserProfile()
      .then((nextProfile) => {
        setProfile(nextProfile);
        setNickname(nextProfile.nickname ?? "");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not read profile");
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const handleSave = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const nextProfile = await updateNickname(nickname.trim() || null);
      setProfile(nextProfile);
      setNickname(nextProfile.nickname ?? "");
      setMessage("Profile updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 pt-0">
      <div className="border rounded-lg bg-card shadow p-6">
        <p className="text-sm text-muted-foreground mb-1">Status</p>
        <p className="text-lg mb-4">
          {isLoggedIn ? "Logged in" : "Logged out"}
        </p>
        {(profile?.email || user?.email) && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-1">Email</p>
            <p className="text-lg">{profile?.email ?? user?.email}</p>
          </div>
        )}
        {isLoggedIn && (
          <div className="max-w-md space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Nickname</p>
              <Input
                value={nickname}
                maxLength={20}
                disabled={loading}
                placeholder="Add a nickname"
                onChange={(event) => setNickname(event.target.value)}
              />
            </div>
            <Button type="button" disabled={loading} onClick={handleSave}>
              Save nickname
            </Button>
            {message && <p className="text-sm text-green-700">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
