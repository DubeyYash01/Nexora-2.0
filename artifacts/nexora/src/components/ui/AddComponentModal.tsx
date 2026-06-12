import { useState, useEffect, useRef } from "react";
import { X, Minus, Plus } from "lucide-react";
import type { UserComponent } from "./ComponentCard";

const COMMON_COMPONENTS: Array<{ name: string; category: string }> = [
  { name: "ESP32 DevKit V1", category: "microcontroller" },
  { name: "ESP8266 NodeMCU", category: "microcontroller" },
  { name: "Arduino Uno R3", category: "microcontroller" },
  { name: "Arduino Nano", category: "microcontroller" },
  { name: "DHT11 Temperature Sensor", category: "sensor" },
  { name: "DHT22 Temperature Sensor", category: "sensor" },
  { name: "HC-SR04 Ultrasonic Sensor", category: "sensor" },
  { name: "PIR Motion Sensor", category: "sensor" },
  { name: "Soil Moisture Sensor", category: "sensor" },
  { name: "MQ-2 Gas Sensor", category: "sensor" },
  { name: "MQ-135 Air Quality Sensor", category: "sensor" },
  { name: "BMP280 Pressure Sensor", category: "sensor" },
  { name: "MPU6050 Gyroscope", category: "sensor" },
  { name: "DS18B20 Temperature Sensor", category: "sensor" },
  { name: "LDR Sensor", category: "sensor" },
  { name: "IR Sensor", category: "sensor" },
  { name: "Flame Sensor", category: "sensor" },
  { name: "Water Level Sensor", category: "sensor" },
  { name: "Rain Sensor", category: "sensor" },
  { name: "Touch Sensor", category: "sensor" },
  { name: "OLED Display 0.96\"", category: "display" },
  { name: "LCD 16x2 Display", category: "display" },
  { name: "7 Segment Display", category: "display" },
  { name: "Servo Motor SG90", category: "actuator" },
  { name: "DC Motor", category: "actuator" },
  { name: "Stepper Motor 28BYJ-48", category: "actuator" },
  { name: "L298N Motor Driver", category: "module" },
  { name: "Relay Module 1 Channel", category: "actuator" },
  { name: "Relay Module 2 Channel", category: "actuator" },
  { name: "LED (various colors)", category: "passive" },
  { name: "RGB LED", category: "passive" },
  { name: "Buzzer Active", category: "actuator" },
  { name: "Buzzer Passive", category: "actuator" },
  { name: "Push Button", category: "passive" },
  { name: "Potentiometer", category: "passive" },
  { name: "NRF24L01 RF Module", category: "communication" },
  { name: "HC-05 Bluetooth Module", category: "communication" },
  { name: "HC-06 Bluetooth Module", category: "communication" },
  { name: "SIM800L GSM Module", category: "communication" },
  { name: "Neo-6M GPS Module", category: "communication" },
  { name: "SD Card Module", category: "module" },
  { name: "Real Time Clock DS3231", category: "module" },
  { name: "RFID RC522 Module", category: "module" },
  { name: "Fingerprint Sensor", category: "sensor" },
  { name: "18650 Li-ion Battery", category: "power" },
  { name: "TP4056 Battery Charger", category: "power" },
  { name: "Buck Converter", category: "power" },
  { name: "Breadboard", category: "passive" },
  { name: "Jumper Wires", category: "passive" },
  { name: "Resistor Kit", category: "passive" },
  { name: "Capacitor Kit", category: "passive" },
];

const CATEGORIES = [
  "microcontroller", "sensor", "actuator", "display",
  "communication", "power", "passive", "module", "other",
];

const CONDITIONS = ["new", "working", "untested", "faulty"] as const;

interface FormState {
  name: string;
  category: string;
  quantity: number;
  condition: "new" | "working" | "untested" | "faulty";
  purchasePrice: string;
  notes: string;
}

const defaultForm: FormState = {
  name: "",
  category: "microcontroller",
  quantity: 1,
  condition: "working",
  purchasePrice: "",
  notes: "",
};

export default function AddComponentModal({
  open,
  editComponent,
  onClose,
  onSave,
}: {
  open: boolean;
  editComponent?: UserComponent | null;
  onClose: () => void;
  onSave: (data: Omit<FormState, "purchasePrice"> & { purchasePrice: number | null }) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [autocomplete, setAutocomplete] = useState<typeof COMMON_COMPONENTS>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editComponent) {
      setForm({
        name: editComponent.name,
        category: editComponent.category,
        quantity: editComponent.quantity,
        condition: editComponent.condition,
        purchasePrice: editComponent.purchase_price != null ? String(editComponent.purchase_price) : "",
        notes: editComponent.notes ?? "",
      });
    } else {
      setForm(defaultForm);
    }
    setTimeout(() => nameRef.current?.focus(), 100);
  }, [open, editComponent]);

  const handleNameChange = (val: string) => {
    setForm((f) => ({ ...f, name: val }));
    if (val.length >= 1) {
      const matches = COMMON_COMPONENTS.filter((c) =>
        c.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 6);
      setAutocomplete(matches);
      setShowAutocomplete(matches.length > 0);
    } else {
      setShowAutocomplete(false);
    }
  };

  const selectAutoComplete = (item: (typeof COMMON_COMPONENTS)[0]) => {
    setForm((f) => ({ ...f, name: item.name, category: item.category }));
    setShowAutocomplete(false);
  };

  const handleSubmit = async (addAnother = false) => {
    if (!form.name || !form.category || !form.condition) return;
    setSaving(true);
    try {
      await onSave({
        name: form.name,
        category: form.category,
        quantity: form.quantity,
        condition: form.condition,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        notes: form.notes,
      });
      if (addAnother) {
        setForm(defaultForm);
        nameRef.current?.focus();
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-end"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:w-[440px] h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden"
        style={{
          background: "#0D0D14",
          borderLeft: "1px solid #2A2A3E",
          borderTop: "1px solid #2A2A3E",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor: "#2A2A3E" }}>
          <h2 className="text-lg font-bold" style={{ color: "#F0F0FF" }}>
            {editComponent ? "Edit Component" : "Add Component"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "#9090B0" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(90,90,122,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Name */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#C0C0D0" }}>
              Component Name <span style={{ color: "#FF5A5A" }}>*</span>
            </label>
            <input
              ref={nameRef}
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
              placeholder="e.g. ESP32 DevKit V1"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all"
              style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}
              onFocus={(e) => {
                e.target.style.borderColor = "#6C63FF";
                if (form.name) handleNameChange(form.name);
              }}
              onBlurCapture={(e) => (e.target.style.borderColor = "#2A2A3E")}
            />
            {showAutocomplete && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border overflow-hidden"
                style={{ background: "#1A1A2E", borderColor: "#2A2A3E" }}>
                {autocomplete.map((item) => (
                  <button
                    key={item.name}
                    onMouseDown={() => selectAutoComplete(item)}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors"
                    style={{ color: "#C0C0D0" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(108,99,255,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <span>{item.name}</span>
                    <span className="text-[10px] capitalize px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>
                      {item.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#C0C0D0" }}>
              Category <span style={{ color: "#FF5A5A" }}>*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all capitalize"
              style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#C0C0D0" }}>
              Quantity <span style={{ color: "#FF5A5A" }}>*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
                style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3E")}
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm border outline-none text-center"
                style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}
              />
              <button
                onClick={() => setForm((f) => ({ ...f, quantity: f.quantity + 1 }))}
                className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
                style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3E")}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#C0C0D0" }}>
              Condition <span style={{ color: "#FF5A5A" }}>*</span>
            </label>
            <div className="flex gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, condition: c }))}
                  className="flex-1 py-2 rounded-xl text-xs font-medium capitalize border transition-all"
                  style={{
                    background: form.condition === c ? "#6C63FF" : "#0A0A0F",
                    borderColor: form.condition === c ? "#6C63FF" : "#2A2A3E",
                    color: form.condition === c ? "#fff" : "#9090B0",
                  }}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Purchase Price */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#C0C0D0" }}>
              Purchase Price <span style={{ color: "#5A5A7A", fontWeight: 400 }}>(optional)</span>
            </label>
            <div className="flex items-center border rounded-xl overflow-hidden transition-all"
              style={{ borderColor: "#2A2A3E", background: "#0A0A0F" }}>
              <span className="px-3 text-sm font-medium flex-shrink-0" style={{ color: "#5A5A7A" }}>₹</span>
              <input
                type="number"
                min={0}
                value={form.purchasePrice}
                onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                placeholder="0"
                className="flex-1 py-3 pr-4 text-sm outline-none"
                style={{ background: "transparent", color: "#F0F0FF" }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#C0C0D0" }}>
              Notes <span style={{ color: "#5A5A7A", fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Any notes about this component — model number, bought from, issues noticed..."
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none resize-none transition-all"
              style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}
              onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
              onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0 space-y-2" style={{ borderColor: "#2A2A3E" }}>
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving || !form.name}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: form.name ? "#6C63FF" : "#1A1A2E",
              color: form.name ? "#fff" : "#3A3A5A",
              cursor: form.name ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Saving..." : editComponent ? "Save Changes" : "Add to Inventory"}
          </button>
          {!editComponent && (
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving || !form.name}
              className="w-full py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={{
                borderColor: "#2A2A3E",
                color: "#9090B0",
                background: "transparent",
                cursor: form.name ? "pointer" : "not-allowed",
              }}
              onMouseEnter={(e) => {
                if (form.name) {
                  e.currentTarget.style.borderColor = "#6C63FF";
                  e.currentTarget.style.color = "#6C63FF";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2A2A3E";
                e.currentTarget.style.color = "#9090B0";
              }}
            >
              Add Another
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
