import React, { useState, useEffect } from "react";

interface BankAccount {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

interface CheckoutProps {
  productId: number;
  productPrice: number;
  buyerName: string;
  buyerPhone: string;
  onOrderSuccess?: () => void;
}

export const CheckoutPayment: React.FC<CheckoutProps> = ({
  productId,
  productPrice,
  buyerName,
  buyerPhone,
  onOrderSuccess,
}) => {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // የኮሚሽን ፐርሰንታይል ስሌት (በቀደመው ውይይት መሰረት)
  const calculateCommission = (price: number) => {
    if (price < 5000) return price * 0.08; // 8%
    if (price <= 100000) return price * 0.05; // 5%
    if (price <= 1000000) return price * 0.02; // 2%
    return price * 0.01; // 1%
  };

  const commission = calculateCommission(productPrice);

  useEffect(() => {
    fetch("/api/bank-accounts")
      .then((res) => res.json())
      .then((data) => {
        setBanks(data);
        if (data.length > 0) setSelectedBank(data[0]);
      })
      .catch(() => setMessage("የባንክ መረጃዎችን መጫን አልተቻለም"));
  }, []);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) return alert("እባክዎን የባንክ አካውንት ይምረጡ");
    if (!transactionRef) return alert("እባክዎን የክፍያ ማረጋገጫ ቁጥር ይጻፉ");

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          buyerName,
          buyerPhone,
          totalAmount: productPrice.toString(),
          commissionAmount: commission.toString(),
          bankAccountId: selectedBank.id,
          transactionRef,
          status: "pending",
        }),
      });

      if (response.ok) {
        setMessage("ትዕዛዝዎ በትክክል ተልኳል! አድሚኑ ክፍያውን አረጋግጦ ይደውልልዎታል።");
        setTransactionRef("");
        if (onOrderSuccess) onOrderSuccess();
      } else {
        setMessage("ትዕዛዙን መላክ አልተቻለም፤ እባክዎን እንደገና ይሞክሩ።");
      }
    } catch (err) {
      setMessage("የኔትወርክ ስህተት አጋጥሟል");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", borderRadius: "8px", maxWidth: "500px" }}>
      <h2>የክፍያ ገጽ (Checkout)</h2>

      <div style={{ background: "#f0f4f8", padding: "10px", borderRadius: "5px", marginBottom: "15px" }}>
        <p><strong>የእቃው ዋጋ፦</strong> {productPrice.toLocaleString()} ብር</p>
        <p><strong>የአፕሊኬሽኑ አገልግሎት ክፍያ (Commission)፦</strong> {commission.toLocaleString()} ብር</p>
      </div>

      <h3>1. የሚከፍሉበትን ባንክ ይምረጡ</h3>
      <select 
        value={selectedBank?.id || ""} 
        onChange={(e) => {
          const bank = banks.find((b) => b.id === parseInt(e.target.value));
          setSelectedBank(bank || null);
        }}
        style={{ width: "100%", padding: "8px", marginBottom: "15px" }}
      >
        {banks.map((bank) => (
          <option key={bank.id} value={bank.id}>
            {bank.bankName}
          </option>
        ))}
      </select>

      {selectedBank && (
        <div style={{ background: "#e9f5ec", padding: "12px", borderRadius: "5px", marginBottom: "15px" }}>
          <p><strong>የባንክ ስም፦</strong> {selectedBank.bankName}</p>
          <p><strong>የአካውንት ስም፦</strong> {selectedBank.accountName}</p>
          <p><strong>የአካውንት ቁጥር፦</strong> <span style={{ fontSize: "18px", fontWeight: "bold" }}>{selectedBank.accountNumber}</span></p>
        </div>
      )}

      <form onSubmit={handleOrderSubmit}>
        <h3>2. የክፍያ ማረጋገጫ ቁጥር ያስገቡ</h3>
        <input 
          type="text" 
          placeholder="የትራንዛክሽን ቁጥር (ለምሳሌ፦ FT1234567)" 
          value={transactionRef} 
          onChange={(e) => setTransactionRef(e.target.value)} 
          required 
          style={{ width: "100%", padding: "8px", marginBottom: "15px", boxSizing: "border-box" }}
        />

        <button 
          type="submit" 
          disabled={loading}
          style={{ width: "100%", background: "#28a745", color: "#fff", padding: "12px", border: "none", borderRadius: "5px", fontSize: "16px", cursor: "pointer" }}
        >
          {loading ? "እየተላከ ነው..." : "ክፍያውን አረጋግጥና ትዕዛዝ ላክ"}
        </button>
      </form>

      {message && <p style={{ marginTop: "15px", fontWeight: "bold", color: message.includes("በትክክል") ? "green" : "red" }}>{message}</p>}
    </div>
  );
};
