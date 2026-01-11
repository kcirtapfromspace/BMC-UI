import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import TableItem from "@/components/TableItem";
import TabView from "@/components/TabView";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNetworkConfigQuery } from "@/lib/api/get";
import { useNetworkConfigMutation } from "@/lib/api/set";

export const Route = createLazyFileRoute("/_tabLayout/network")({
  component: Network,
});

const BONDING_MODES = [
  { value: "balance-alb", label: "Adaptive Load Balancing", description: "No switch config required" },
  { value: "active-backup", label: "Active-Backup", description: "Failover only" },
  { value: "802.3ad", label: "802.3ad (LACP)", description: "Requires switch LACP support" },
  { value: "balance-tlb", label: "Transmit Load Balancing", description: "Outbound load balancing" },
  { value: "balance-rr", label: "Round-Robin", description: "Requires switch support" },
  { value: "balance-xor", label: "XOR", description: "Requires switch support" },
];

function Network() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data, refetch } = useNetworkConfigQuery();
  const mutation = useNetworkConfigMutation();

  const [bondingEnabled, setBondingEnabled] = useState(data?.bonding_enabled ?? false);
  const [bondingMode, setBondingMode] = useState(data?.bonding_mode ?? "balance-alb");
  const [hasChanges, setHasChanges] = useState(false);

  const handleEnableChange = (checked: boolean) => {
    setBondingEnabled(checked);
    setHasChanges(true);
  };

  const handleModeChange = (value: string) => {
    setBondingMode(value);
    setHasChanges(true);
  };

  const handleSave = async (apply: boolean) => {
    try {
      await mutation.mutateAsync({
        enabled: bondingEnabled,
        mode: bondingMode,
        apply,
      });
      setHasChanges(false);
      await refetch();
      toast({
        title: apply ? t("network.configApplied") : t("network.configSaved"),
        description: apply 
          ? t("network.applyDescription")
          : t("network.saveDescription"),
      });
    } catch {
      toast({
        title: t("common.error"),
        description: t("network.saveFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <TabView>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">{t("network.linkAggregation")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("network.description")}
          </p>
        </div>

        <dl className="flex flex-col">
          <TableItem term={t("network.status")}>
            {data?.bonding_active ? (
              <span className="text-green-600">{t("network.active")}</span>
            ) : (
              <span className="text-gray-500">{t("network.inactive")}</span>
            )}
          </TableItem>
          {data?.bonding_active && (
            <>
              <TableItem term={t("network.currentMode")}>
                {data?.bonding_mode ?? "Unknown"}
              </TableItem>
              <TableItem term={t("network.slaveInterfaces")}>
                {data?.slaves?.join(", ") || "None"}
              </TableItem>
              <TableItem term={t("network.miiMonitor")}>
                {data?.miimon ?? 100}ms
              </TableItem>
            </>
          )}
        </dl>

        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{t("network.enableBonding")}</span>
              <p className="text-sm text-muted-foreground">
                {t("network.enableDescription")}
              </p>
            </div>
            <Switch
              checked={bondingEnabled}
              onCheckedChange={handleEnableChange}
            />
          </div>

          {bondingEnabled && (
            <div className="space-y-2">
              <span className="text-sm font-medium">{t("network.bondingMode")}</span>
              <Select value={bondingMode} onValueChange={handleModeChange}>
                <SelectTrigger label="Bonding Mode">
                  <SelectValue placeholder={t("network.selectMode")} />
                </SelectTrigger>
                <SelectContent>
                  {BONDING_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      <div>
                        <div>{mode.label}</div>
                        <div className="text-xs text-muted-foreground">{mode.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => handleSave(false)}
              disabled={!hasChanges || mutation.isPending}
              variant="bw"
            >
              {t("network.saveReboot")}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={!hasChanges || mutation.isPending}
              variant="turing-green"
            >
              {t("network.saveApply")}
            </Button>
          </div>
          
          {hasChanges && (
            <p className="text-sm text-amber-600">
              {t("network.unsavedChanges")}
            </p>
          )}
        </div>
      </div>
    </TabView>
  );
}
