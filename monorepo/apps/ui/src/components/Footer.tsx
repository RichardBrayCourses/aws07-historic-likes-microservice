import { useEffect, useState } from "react";
import {
  checkAdministratorMembership,
  checkPhotosServiceHealth,
} from "@/services/photosService";
import { useAuth } from "@/context/AuthContext";

const Footer = () => {
  const { isLoggedIn } = useAuth();
  const [photosServiceIsHealthy, setPhotosServiceIsHealthy] = useState<
    boolean | null
  >(null);
  const [isAdministrator, setIsAdministrator] = useState(false);

  useEffect(() => {
    const checkServices = async () => {
      try {
        const isHealthy = await checkPhotosServiceHealth();
        setPhotosServiceIsHealthy(isHealthy);

        if (!isLoggedIn) {
          setIsAdministrator(false);
          return;
        }

        const administrator = await checkAdministratorMembership();
        setIsAdministrator(administrator);
      } catch {
        setPhotosServiceIsHealthy(false);
        setIsAdministrator(false);
      }
    };

    void checkServices();
  }, [isLoggedIn]);

  const servicesStatus =
    photosServiceIsHealthy === null
      ? "services: checking"
      : photosServiceIsHealthy
        ? "services: ok"
        : "services: photos service down";

  return (
    <footer className="border-t px-4 py-1.5">
      <div className="mx-auto flex max-w-5xl justify-end gap-4">
        {isAdministrator && <span>administrator</span>}
        <span>{servicesStatus}</span>
      </div>
    </footer>
  );
};

export default Footer;
