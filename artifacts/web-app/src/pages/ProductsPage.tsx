// mockup-sandbox/src/pages/ProductsPage.tsx
import React, { useState, useEffect } from "react";
import { customFetch } from "@workspace/api-client-react";

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  // 1. Fetch Products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await customFetch<Product[]>("/api/products");
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 2. Add New Product
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    try {
      await customFetch<Product>("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          price: parseFloat(price),
          description,
          category: "Furniture",
          currency: "USD",
        }),
      });

      setName("");
      setPrice("");
      setDescription("");
      fetchProducts(); // Refresh List
    } catch (err: any) {
      alert("Error adding product: " + err.message);
    }
  };

  // 3. Delete Product
  const handleDelete = async (id: number) => {
    try {
      await customFetch(`/api/products/${id}`, { method: "DELETE" });
      fetchProducts();
    } catch (err: any) {
      alert("Error deleting product: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 font-sans">
      <h1 className="text-3xl font-bold text-gray-900">የእቃዎች ዝርዝር እና መመዝገቢያ</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md border space-y-4">
        <h2 className="text-xl font-semibold">አዲስ እቃ መመዝገቢያ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="የእቃው ስም (Name)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="number"
            placeholder="ዋጋ (Price)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="p-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <textarea
          placeholder="መግለጫ (Description)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="p-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          እቃውን መዝግብ
        </button>
      </form>

      {/* Product List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">የተመዘገቡ እቃዎች</h2>
        {loading && <p className="text-gray-500">እቃዎች በመጫን ላይ ናቸው...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((item) => (
            <div key={item.id} className="p-4 bg-white border rounded-lg shadow-sm flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
                <p className="text-blue-600 font-semibold mt-2">
                  {item.price} {item.currency}
                </p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                ሰርዝ
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
