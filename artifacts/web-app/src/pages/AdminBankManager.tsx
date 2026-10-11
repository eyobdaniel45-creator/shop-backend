import React, { useState, useEffect } from "react";

interface BankAccount {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  isActive: boolean;
}

const ADMIN_TOKEN_STORAGE_KEY = "admin-bank-manager.jwt";

interface AuthResponse {
  token?: unknown;
}

interface CurrentUserResponse {
  user?: {
    role?: unknown;
  };
}

async function isAdminSessionValid(token: string): Promise<boolean> {
  const response = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null) as CurrentUserResponse | null;
  return response.ok && typeof data?.user?.role === "string" &&
    data.user.role.trim().toUpperCase() === "ADMIN";
}

async function requestBankAccounts(token: string): Promise<BankAccount[]> {
  const response = await fetch("/api/bank-accounts", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Unable to load bank accounts");
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Unexpected bank account response");
  }

  return data as BankAccount[];
}

export const AdminBankManager = () => {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  // የማስተካከያ (Editing) እና የመፈለጊያ State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 1. የባንክ አካውንቶችን ማውጫ
  const fetchBanks = async (token: string) => {
    try {
      setBanks(await requestBankAccounts(token));
    } catch {
      setMessage("የባንክ መረጃዎችን ማምጣት አልተቻለም");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const storedToken = window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);

    if (!storedToken) {
      setIsCheckingSession(false);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const validSession = await isAdminSessionValid(storedToken);
        if (cancelled) return;

        if (!validSession) {
          window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
          setAuthMessage("Your session expired or this account no longer has admin access. Please sign in again.");
          return;
        }

        setSessionToken(storedToken);
        setIsAuthenticated(true);
        await fetchBanks(storedToken);
      } catch {
        if (!cancelled) {
          setAuthMessage("Unable to verify your session. Check the connection and try again.");
        }
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    setAuthMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json().catch(() => null) as AuthResponse | null;

      if (!response.ok || typeof data?.token !== "string") {
        setAuthMessage("Sign-in failed. Check your email and password.");
        return;
      }

      const validAdminSession = await isAdminSessionValid(data.token);
      if (!validAdminSession) {
        setAuthMessage("This account does not have administrator access.");
        return;
      }

      window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, data.token);
      setSessionToken(data.token);
      setIsAuthenticated(true);
      setPassword("");
      setAuthMessage("");
      setMessage("");
      await fetchBanks(data.token);
    } catch {
      setAuthMessage("Unable to connect to the sign-in service. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    setSessionToken(null);
    setIsAuthenticated(false);
    setBanks([]);
    setEditingId(null);
    setBankName("");
    setAccountName("");
    setAccountNumber("");
    setAuthMessage("");
    setMessage("");
  };

  const invalidateAdminSession = () => {
    handleLogout();
    setAuthMessage("Your admin session expired or access was removed. Please sign in again.");
  };

  // 2. አዲስ አካውንት መመዝገቢያ ወይም ነባር ማስተካከያ (Add / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) {
      invalidateAdminSession();
      return;
    }
    setLoading(true);

    const url = editingId ? `/api/bank-accounts/${editingId}` : "/api/bank-accounts";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ bankName, accountName, accountNumber }),
      });

      if (res.ok) {
        setMessage(editingId ? "የባንክ መረጃው በትክክል ተስተካክሏል!" : "አዲስ የባንክ አካውንት በትክክል ተመዝግቧል!");
        setBankName("");
        setAccountName("");
        setAccountNumber("");
        setEditingId(null);
        await fetchBanks(sessionToken);
      } else if (res.status === 401 || res.status === 403) {
        invalidateAdminSession();
      } else {
        setMessage("ስህተት አጋጥሟል፤ እባክዎን እንደገና ይሞክሩ");
      }
    } catch {
      setMessage("የኔትወርክ ስህተት አጋጥሟል");
    } finally {
      setLoading(false);
    }
  };

  // 3. አካውንት ማስተካከል ሲፈለግ ፎርሙን መሙያ
  const handleEdit = (bank: BankAccount) => {
    setEditingId(bank.id);
    setBankName(bank.bankName);
    setAccountName(bank.accountName);
    setAccountNumber(bank.accountNumber);
  };

  // 4. የማስተካከያ ሂደቱን መሰረዣ
  const handleCancelEdit = () => {
    setEditingId(null);
    setBankName("");
    setAccountName("");
    setAccountNumber("");
  };

  // 5. አካውንት ማጥፊያ (Delete)
  const handleDelete = async (id: number) => {
    if (!window.confirm("በእርግጥ ይህንን የባንክ አካውንት መሰረዝ ይፈልጋሉ?")) return;
    if (!sessionToken) {
      invalidateAdminSession();
      return;
    }

    try {
      const res = await fetch(`/api/bank-accounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        setMessage("የባንክ አካውንቱ በትክክል ተሰርዟል");
        await fetchBanks(sessionToken);
      } else if (res.status === 401 || res.status === 403) {
        invalidateAdminSession();
      } else {
        setMessage("መሰረዝ አልተቻለም");
      }
    } catch {
      setMessage("መሰረዝ አልተቻለም");
    }
  };

  // 6. አካውንት የማጣሪያ (Search Filter)
  const filteredBanks = banks.filter((b) =>
    b.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.accountNumber.includes(searchTerm)
  );

  return (
    <div style={{ padding: "20px", maxWidth: "700px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2 data-testid="text-admin-dashboard-title" style={{ color: "#333", borderBottom: "2px solid #007bff", paddingBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
        የባንክ አካውንቶች ማስተዳደሪያ (Admin Dashboard)
        {isAuthenticated && (
          <button
            type="button"
            data-testid="button-admin-sign-out"
            onClick={handleLogout}
            style={{ background: "#6c757d", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap" }}
          >
            Sign out
          </button>
        )}
      </h2>

      {isCheckingSession ? (
        <p data-testid="status-admin-session-check" role="status">Checking admin session…</p>
      ) : !isAuthenticated ? (
        <form onSubmit={handleLogin} style={{ maxWidth: "420px", margin: "32px auto", background: "#f8f9fa", padding: "22px", borderRadius: "8px", border: "1px solid #ddd" }}>
          <h3 style={{ marginTop: 0 }}>Admin sign in</h3>
          <p style={{ color: "#555", lineHeight: 1.5 }}>
            Sign in with an account that has the ADMIN role.
          </p>
          {authMessage && (
            <div data-testid="status-admin-auth" role="alert" style={{ padding: "10px", background: "#fff3f3", color: "#9b1c1c", borderRadius: "5px", marginBottom: "15px" }}>
              {authMessage}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              Email
              <input
                data-testid="input-admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: "10px", borderRadius: "4px", border: "1px solid #bbb" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              Password
              <input
                data-testid="input-admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ padding: "10px", borderRadius: "4px", border: "1px solid #bbb" }}
              />
            </label>
            <button
              data-testid="button-admin-sign-in"
              type="submit"
              disabled={isSigningIn}
              style={{ background: "#007bff", color: "#fff", border: "none", padding: "11px 15px", borderRadius: "4px", cursor: isSigningIn ? "wait" : "pointer", fontWeight: 600 }}
            >
              {isSigningIn ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      ) : (
      <div>
      {/* የመልእክት ማሳያ */}
      {message && (
        <div data-testid="status-bank-manager" role="status" style={{ padding: "10px", background: "#e7f3fe", color: "#31708f", borderRadius: "5px", marginBottom: "15px" }}>
          {message}
        </div>
      )}

      {/* የባንክ ማስገቢያ/ማስተካከያ ፎርም */}
      <form onSubmit={handleSubmit} style={{ background: "#f8f9fa", padding: "15px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #ddd" }}>
        <h3>{editingId ? "የባንክ መረጃ ማስተካከያ" : "አዲስ የባንክ አካውንት መመዝገቢያ"}</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input
            data-testid="input-bank-name"
            type="text" 
            placeholder="የባንኩ ስም (ለምሳሌ፦ Commercial Bank of Ethiopia, Telebirr)" 
            value={bankName} 
            onChange={(e) => setBankName(e.target.value)} 
            required 
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <input
            data-testid="input-bank-account-name"
            type="text" 
            placeholder="የአካውንቱ ባለቤት ስም (Account Name)" 
            value={accountName} 
            onChange={(e) => setAccountName(e.target.value)} 
            required 
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <input
            data-testid="input-bank-account-number"
            type="text" 
            placeholder="የአካውንት ቁጥር (Account Number)" 
            value={accountNumber} 
            onChange={(e) => setAccountNumber(e.target.value)} 
            required 
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
          />

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              data-testid="button-save-bank-account"
              type="submit" 
              disabled={loading}
              style={{ background: editingId ? "#ffc107" : "#007bff", color: "#fff", border: "none", padding: "10px 15px", borderRadius: "4px", cursor: "pointer", flex: 1 }}
            >
              {loading ? "እየተላከ ነው..." : editingId ? "መረጃውን አዘምን (Update)" : "አካውንት መዝግብ (Add)"}
            </button>

            {editingId && (
              <button
                data-testid="button-cancel-bank-edit"
                type="button" 
                onClick={handleCancelEdit}
                style={{ background: "#6c757d", color: "#fff", border: "none", padding: "10px 15px", borderRadius: "4px", cursor: "pointer" }}
              >
                ሰርዝ (Cancel)
              </button>
            )}
          </div>
        </div>
      </form>

      {/* የመፈለጊያ ሳጥን */}
      <div style={{ marginBottom: "15px" }}>
        <input
          data-testid="input-bank-search"
          type="text" 
          placeholder="ባንክ፣ ስም ወይም አካውንት ፈልግ..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}
        />
      </div>

      {/* የተመዘገቡ ባንኮች ዝርዝር */}
      <h3 data-testid="text-bank-account-count">የተመዘገቡ ባንኮች ({filteredBanks.length})</h3>
      {filteredBanks.length === 0 ? (
        <p data-testid="text-bank-account-empty" style={{ color: "#777" }}> ምንም የተመዘገበ የባንክ አካውንት የለም።</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredBanks.map((bank) => (
            <div
              key={bank.id}
              data-testid={`card-bank-account-${bank.id}`}
              style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                padding: "12px", 
                background: "#fff", 
                border: "1px solid #e0e0e0", 
                borderRadius: "6px" 
              }}
            >
              <div>
                <strong style={{ fontSize: "16px", color: "#007bff" }}>{bank.bankName}</strong>
                <div style={{ fontSize: "14px", color: "#555" }}>{bank.accountName}</div>
                <div style={{ fontSize: "15px", fontWeight: "bold", marginTop: "3px" }}>{bank.accountNumber}</div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  data-testid={`button-edit-bank-${bank.id}`}
                  onClick={() => handleEdit(bank)}
                  style={{ background: "#17a2b8", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}
                >
                  አስተካክል
                </button>
                <button
                  data-testid={`button-delete-bank-${bank.id}`}
                  onClick={() => handleDelete(bank.id)}
                  style={{ background: "#dc3545", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}
                >
                  ሰርዝ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      )}
    </div>
  );
};
