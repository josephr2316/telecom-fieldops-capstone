import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProductCard } from "../components/catalog/ProductCard";
import { ProductDetail } from "../components/catalog/ProductDetail";
import type { Product } from "../types/product";
import Layout from "../layouts/Layout";
import PageNavigation from "../components/PageNavigation";
import { apiClient } from "../services/apiClient";

const CATEGORY_LABELS: Record<string, string> = {
  ALL: "Todos",
  ROUTER: "Routers",
  MODEM: "Modems",
  ONT: "ONT",
  STB: "Decodificadores",
  CABLE: "Cables",
  SIM: "SIM",
  ANTENNA: "Antenas",
};

export const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<Product[]>("/api/v1/catalog/products");
        setProducts(data);
      } catch (err) {
        console.error("Error cargando productos:", err);
        setError("No se pudieron cargar los productos. Verifica que el servidor este activo.");
      } finally {
        setLoading(false);
      }
    };
    void fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesCategory = filter === "ALL" || p.category === filter;
    const matchesSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ["ALL", ...new Set(products.map((p) => p.category))];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 text-gray-800">
          <PageNavigation />
          <header className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <button onClick={() => navigate("/home")} className="text-sm text-gray-600 hover:text-gray-800 mb-3">
              Volver al panel principal
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">Catalogo de productos</h1>
            <p className="text-sm text-gray-600 mt-1">{products.length} productos registrados</p>
          </header>

          <section className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Buscar por nombre o ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:max-w-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
              />
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={
                      filter === cat
                        ? "bg-[#002D72] text-white px-4 py-2 text-sm rounded-sm hover:bg-[#001F4D]"
                        : "bg-white border border-gray-200 text-gray-800 px-4 py-2 text-sm rounded-sm hover:border-[#002D72]"
                    }
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {loading ? (
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-sm p-6">
                  <div className="h-4 bg-gray-100 mb-3" />
                  <div className="h-4 bg-gray-100 mb-3" />
                  <div className="h-8 bg-gray-100" />
                </div>
              ))}
            </section>
          ) : error ? (
            <section className="bg-white border border-gray-200 rounded-sm p-6">
              <p className="text-sm text-gray-700">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72]"
              >
                Reintentar
              </button>
            </section>
          ) : filteredProducts.length === 0 ? (
            <section className="bg-white border border-gray-200 rounded-sm p-6 text-center">
              <p className="text-sm text-gray-600">No se encontraron productos con los filtros actuales.</p>
            </section>
          ) : (
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onSelect={(p) => setSelectedProduct(p)} />
              ))}
            </section>
          )}
        </div>
      </div>

      {selectedProduct && <ProductDetail product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </Layout>
  );
};
