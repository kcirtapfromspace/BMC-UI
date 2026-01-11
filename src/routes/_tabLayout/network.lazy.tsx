import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import TableItem from "@/components/TableItem";
import TabView from "@/components/TabView";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
        title: apply ? "Network configuration applied" : "Network configuration saved",
        description: apply 
          ? "Network settings have been applied. Connection may be briefly interrupted."
          : "Changes saved. Reboot to apply.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save network configuration",
        variant: "destructive",
      });
    }
  };

  return (
    <TabView>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Link Aggregation (Bonding)</h3>
          <p className="text-sm text-muted-foreground">
            Combine both Ethernet ports for increased bandwidth or failover.
          </p>
        </div>

        <dl className="flex flex-col">
          <TableItem term="Status">
            {data?.bonding_active ? (
              <span className="text-green-600">Active</span>
            ) : (
              <span className="text-gray-500">Inactive</span>
            )}
          </TableItem>
          {data?.bonding_active && (
            <>
              <TableItem term="Current Mode">
                {data?.bonding_mode ?? "Unknown"}
              </TableItem>
              <TableItem term="Slave Interfaces">
                {data?.slaves?.join(", ") || "None"}
              </TableItem>
              <TableItem term="MII Monitor Interval">
                {data?.miimon ?? 100}ms
              </TableItem>
            </>
          )}
        </dl>

        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="bonding-toggle">Enable Link Aggregation</Label>
              <p className="text-sm text-muted-foreground">
                Bond ge0 and ge1 into a single interface
              </p>
            </div>
            <Switch
              id="bonding-toggle"
              checked={bondingEnabled}
              onCheckedChange={handleEnableChange}
            />
          </div>

          {bondingEnabled && (
            <div className="space-y-2">
              <Label htmlFor="bonding-mode">Bonding Mode</Label>
              <Select value={bondingMode} onValueChange={handleModeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
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
              variant="outline"
            >
              Save (Apply on Reboot)
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={!hasChanges || mutation.isPending}
            >
              Save & Apply Now
            </Button>
          </div>
          
          {hasChanges && (
            <p className="text-sm text-amber-600">
              You have unsaved changes.
            </p>
          )}
        </div>
      </div>
    </TabView>
  );
}
