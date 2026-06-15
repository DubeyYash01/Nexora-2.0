import React, { createContext, useContext, useEffect, useState } from "react";

interface FeatureFlags {
  blueprint_marketplace: boolean;
  professor_assignments: boolean;
  component_suggestions: boolean;
  shopping_list: boolean;
  public_profiles: boolean;
  user_registration: boolean;
  [key: string]: boolean;
}

interface FeatureFlagContextType {
  flags: FeatureFlags;
  loading: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  refetchFlags: () => void;
}

const defaults: FeatureFlags = {
  blueprint_marketplace: true,
  professor_assignments: true,
  component_suggestions: true,
  shopping_list: true,
  public_profiles: true,
  user_registration: true,
};

const FeatureFlagContext = createContext<FeatureFlagContextType>({
  flags: defaults,
  loading: true,
  maintenanceMode: false,
  maintenanceMessage: "",
  refetchFlags: () => {},
});

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(defaults);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  const fetchFlags = async () => {
    try {
      const [flagsRes, configRes] = await Promise.all([
        fetch("/api/admin/feature-flags"),
        fetch("/api/admin/platform-config"),
      ]);
      if (flagsRes.ok) {
        const { flags: f } = await flagsRes.json();
        setFlags({ ...defaults, ...f });
      }
      if (configRes.ok) {
        const { config } = await configRes.json();
        setMaintenanceMode(config.maintenance_mode === "true");
        setMaintenanceMessage(config.maintenance_message ?? "");
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  return (
    <FeatureFlagContext.Provider value={{ flags, loading, maintenanceMode, maintenanceMessage, refetchFlags: fetchFlags }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}

export default FeatureFlagContext;
