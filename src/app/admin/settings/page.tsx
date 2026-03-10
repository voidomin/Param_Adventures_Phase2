"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Info, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

interface TaxItem {
  id: string;
  name: string;
  percentage: number;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  
  const [taxConfig, setTaxConfig] = useState<TaxItem[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({
    companyName: "Param Adventures Pvt Ltd",
    companyAddress: "... Dehradun, Uttarakhand ...",
    gstNumber: "",
    panNumber: "",
    stateCode: "05",
  });
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!isLoading) {
      if (user?.role !== "SUPER_ADMIN") {
        router.push("/admin");
      }
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (isLoading || (user && user.role !== "SUPER_ADMIN")) return;

    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings && Object.keys(data.settings).length > 0) {
          // Destructure out the taxConfig array to manage it separately
          const { taxConfig: remoteTaxConfig, ...otherSettings } = data.settings;
          
          if (Array.isArray(remoteTaxConfig)) {
             setTaxConfig(remoteTaxConfig);
          }
          
          setSettings((prev) => ({ ...prev, ...otherSettings }));
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingData(false));
  }, [isLoading, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg({ type: "", text: "" });
    try {
      const payload = {
         ...settings,
         taxConfig: JSON.stringify(taxConfig)
      };

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      
      setStatusMsg({ type: "success", text: "Settings saved successfully." });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
    } catch (error: any) {
      setStatusMsg({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const addTaxItem = () => {
    setTaxConfig((prev) => [
      ...prev,
      { id: `tax-${crypto.randomUUID().slice(0, 6)}`, name: "", percentage: 0 }
    ]);
  };

  const removeTaxItem = (id: string) => {
    setTaxConfig((prev) => prev.filter((item) => item.id !== id));
  };

  const updateTaxItem = (id: string, field: keyof TaxItem, value: string | number) => {
    setTaxConfig((prev) =>
      prev.map((item) => {
         if (item.id === id) {
            return { ...item, [field]: value };
         }
         return item;
      })
    );
  };

  if (isLoading || isLoadingData) {
    return (
      <div className="flex justify-center py-20">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Double check if somehow reaching here without valid state
  if (user?.role !== "SUPER_ADMIN") return null;

  return (
    <div className="max-w-4xl pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Platform Settings</h1>
          <p className="text-foreground/60 mt-1">Configure global platform taxes and company details for GST invoicing.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl mb-6 font-medium border ${statusMsg.type === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        
        {/* Taxes & Fees Section */}
        <div className="p-8 border-b border-border/50">
           <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
             Taxes & Fees (%)
           </h2>
           
           <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-foreground/80">
                <p className="font-bold mb-1">Reverse Calculation Logic & Dynamic Fees</p>
                <p>Add completely dynamic taxes or deductibles here (e.g. "CGST", "Trek Leader Fee"). When an admin inputs the <strong>Gross Total Price</strong> of a trip, the system will apply all active percentages globally to backwards-calculate the true net revenue.</p>
              </div>
           </div>

           <div className="space-y-4">
              {taxConfig.map((item, index) => (
                 <div key={item.id} className="flex gap-4 items-end">
                    <div className="flex-1">
                       <label htmlFor={`tax-name-${item.id}`} className="block text-sm font-semibold text-foreground/70 mb-2">Deductible Name</label>
                       <input 
                          id={`tax-name-${item.id}`}
                          type="text" 
                          placeholder="e.g. CGST or Environment Fee" 
                          value={item.name} 
                          onChange={(e) => updateTaxItem(item.id, "name", e.target.value)} 
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary" 
                       />
                    </div>
                    <div className="w-48">
                       <label htmlFor={`tax-perc-${item.id}`} className="block text-sm font-semibold text-foreground/70 mb-2">Percentage</label>
                       <div className="relative">
                          <input 
                             id={`tax-perc-${item.id}`}
                             type="number" 
                             step="0.01" 
                             min="0"
                             value={item.percentage} 
                             onChange={(e) => updateTaxItem(item.id, "percentage", Number.parseFloat(e.target.value) || 0)} 
                             className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-8 focus:outline-none focus:border-primary" 
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/50 font-bold">%</span>
                       </div>
                    </div>
                    <button 
                       type="button" 
                       onClick={() => removeTaxItem(item.id)} 
                       className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
                    >
                       <Trash2 className="w-5 h-5" />
                    </button>
                 </div>
              ))}
              
              <button 
                onClick={addTaxItem} 
                className="mt-4 flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors py-2 px-1"
              >
                 <Plus className="w-4 h-4" /> Add Tax / Fee Component
              </button>
           </div>
        </div>

        {/* Company Identity Section */}
        <div className="p-8">
           <h2 className="text-xl font-bold text-foreground mb-6">
             Company Identity (For GST Invoice)
           </h2>
           <div className="space-y-6">
              <div>
                 <label htmlFor="companyName" className="block text-sm font-semibold text-foreground/70 mb-2">Company Name</label>
                 <input id="companyName" type="text" name="companyName" value={settings.companyName} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="gstNumber" className="block text-sm font-semibold text-foreground/70 mb-2">GSTIN</label>
                  <input id="gstNumber" type="text" name="gstNumber" value={settings.gstNumber} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary uppercase" />
                </div>
                <div>
                  <label htmlFor="panNumber" className="block text-sm font-semibold text-foreground/70 mb-2">PAN</label>
                  <input id="panNumber" type="text" name="panNumber" value={settings.panNumber} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary uppercase" />
                </div>
                <div>
                  <label htmlFor="stateCode" className="block text-sm font-semibold text-foreground/70 mb-2">State Code (e.g., 05 for UK)</label>
                  <input id="stateCode" type="text" name="stateCode" value={settings.stateCode} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div>
                 <label htmlFor="companyAddress" className="block text-sm font-semibold text-foreground/70 mb-2">Company Address</label>
                 <textarea id="companyAddress" name="companyAddress" value={settings.companyAddress} onChange={handleChange} rows={3} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary resize-none"></textarea>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
