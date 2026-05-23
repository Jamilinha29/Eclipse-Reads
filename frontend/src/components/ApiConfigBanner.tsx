import {
  PRODUCTION_API_CONFIG_MESSAGE,
  PRODUCTION_API_MISCONFIGURED,
} from "@/lib/apiBases";

const ApiConfigBanner = () => {
  if (!PRODUCTION_API_MISCONFIGURED) return null;

  return (
    <div
      role="alert"
      className="border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
    >
      {PRODUCTION_API_CONFIG_MESSAGE}
    </div>
  );
};

export default ApiConfigBanner;
