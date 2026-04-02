import React, { useState } from "react";
import { Plus, Trash2, CreditCard, ShieldAlert } from "lucide-react";
import { SectionTitle, InputGroup, TabProps } from "./Common";

export default function FinanceTab(props: TabProps) {
  const { getVal, updateSetting } = props;
  
  // Linter-Safe State Initialization: Derived from parent state on mount
  const [localTaxConfig, setLocalTaxConfig] = useState<{ id: string; name: string; percentage: number }[]>(() => {
    const raw = getVal("PLATFORM", "taxConfig");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const saveTaxConfig = (config: { id: string; name: string; percentage: number }[]) => {
    updateSetting("PLATFORM", "taxConfig", JSON.stringify(config));
  };

  const addTaxItem = () => {
    const newConfig = [
      ...localTaxConfig,
      { id: `tax-${crypto.randomUUID().slice(0, 6)}`, name: "", percentage: 0 }
    ];
    setLocalTaxConfig(newConfig);
    saveTaxConfig(newConfig);
  };

  const removeTaxItem = (id: string) => {
    const newConfig = localTaxConfig.filter((item: { id: string }) => item.id !== id);
    setLocalTaxConfig(newConfig);
    saveTaxConfig(newConfig);
  };

  const updateTaxItem = (id: string, field: "name" | "percentage", value: string | number) => {
    const newConfig = localTaxConfig.map((item: { id: string; name: string; percentage: number }) => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setLocalTaxConfig(newConfig);
    saveTaxConfig(newConfig);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
      <SectionTitle 
        title="Taxes & Fees" 
        subtitle="Manage global tax rates and platform service fees." 
        icon={CreditCard} 
      />

      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-foreground/[0.02] border-b border-border">
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-foreground/40">Tax Name</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-foreground/40 text-center">Percentage (%)</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-foreground/40 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {localTaxConfig.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm text-foreground/30 italic">No taxes configured. Click add to begin.</td>
              </tr>
            ) : (
              localTaxConfig.map((tax: { id: string; name: string; percentage: number }) => (
                <tr key={tax.id} className="group hover:bg-foreground/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      value={tax.name}
                      onChange={(e) => updateTaxItem(tax.id, "name", e.target.value)}
                      placeholder="e.g. CGST"
                      className="bg-transparent border-none outline-none font-bold text-foreground w-full placeholder:text-foreground/20 placeholder:font-normal"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <input 
                        type="number" 
                        value={tax.percentage}
                        onChange={(e) => updateTaxItem(tax.id, "percentage", Number.parseFloat(e.target.value) || 0)}
                        className="bg-foreground/5 border border-border rounded-lg px-3 py-1 w-20 text-center font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => removeTaxItem(tax.id)}
                      className="p-2 text-foreground/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="p-4 bg-foreground/[0.02] border-t border-border">
          <button 
            onClick={addTaxItem}
            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl transition-all border border-dashed border-primary/20"
          >
            <Plus className="w-4 h-4" /> Add Tax Component
          </button>
        </div>
      </div>

      <div className="space-y-8 pt-8 border-t border-border/20">
        <SectionTitle 
          title="Company Identity" 
          subtitle="Identity information used for tax invoices and statutory compliance." 
          icon={ShieldAlert} 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputGroup
            label="Registered Company Name"
            value={getVal("PLATFORM", "companyName")}
            onChange={(v: string) => updateSetting("PLATFORM", "companyName", v)}
            placeholder="e.g. Param Adventures Pvt Ltd"
          />
          <InputGroup
            label="GSTIN (Tax ID)"
            value={getVal("PLATFORM", "gstNumber")}
            onChange={(v: string) => updateSetting("PLATFORM", "gstNumber", v)}
            placeholder="27AAAAA0000A1Z5"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputGroup
            label="PAN Number"
            value={getVal("PLATFORM", "panNumber")}
            onChange={(v: string) => updateSetting("PLATFORM", "panNumber", v)}
            placeholder="ABCDE1234F"
          />
          <InputGroup
            label="State / Region Code"
            value={getVal("PLATFORM", "stateCode")}
            onChange={(v: string) => updateSetting("PLATFORM", "stateCode", v)}
            placeholder="e.g. 27 (Maharashtra)"
          />
        </div>
        <InputGroup
          label="Registered Address"
          value={getVal("PLATFORM", "companyAddress")}
          onChange={(v: string) => updateSetting("PLATFORM", "companyAddress", v)}
          textarea
          placeholder="Enter the full registered address for invoices..."
        />
      </div>
    </div>
  );
}
