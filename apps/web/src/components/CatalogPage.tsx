import React, { useState } from "react";
import { Plan, Product, CreatePlanDto, CreateProductDto, PLAN_TYPE_LABELS, PRODUCT_CATEGORY_LABELS } from "../types/catalog";
import { useCatalog } from "./useCatalog";
import { PlanFormModal } from "./PlanFormModal";
import { ProductFormModal } from "./ProductFormModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import Layout from "../layouts/Layout";

type Tab = "plans" | "products";

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency }).format(price);
}

export function CatalogPage() {
  const {
    plans,
    products,
    loadPlans,
    addPlan,
    editPlan,
    removePlan,
    loadProducts,
    addProduct,
    editProduct,
    removeProduct,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState<Tab>("plans");
  const [planModal, setPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  function openCreatePlan() {
    setEditingPlan(null);
    setPlanModal(true);
  }

  function openEditPlan(plan: Plan) {
    setEditingPlan(plan);
    setPlanModal(true);
  }

  function openCreateProduct() {
    setEditingProduct(null);
    setProductModal(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setProductModal(true);
  }

  async function handleSavePlan(dto: CreatePlanDto) {
    const ok = editingPlan ? await editPlan(editingPlan.id, dto) : await addPlan(dto);
    if (ok) {
      setPlanModal(false);
      setEditingPlan(null);
    }
  }

  async function handleSaveProduct(dto: CreateProductDto) {
    const ok = editingProduct ? await editProduct(editingProduct.id, dto) : await addProduct(dto);
    if (ok) {
      setProductModal(false);
      setEditingProduct(null);
    }
  }

  async function handleDeletePlan() {
    if (!deletingPlan) return;
    const ok = await removePlan(deletingPlan.id);
    if (ok) setDeletingPlan(null);
  }

  async function handleDeleteProduct() {
    if (!deletingProduct) return;
    const ok = await removeProduct(deletingProduct.id);
    if (ok) setDeletingProduct(null);
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 text-gray-800">
          <header className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Gestion de catalogo</h1>
            <p className="text-sm text-gray-600 mt-1">Administra planes y productos del sistema comercial.</p>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <article className="bg-white border border-gray-200 rounded-sm p-6">
              <p className="text-sm text-gray-600">Planes</p>
              <p className="text-2xl font-semibold text-gray-800 mt-2">{plans.items.length}</p>
            </article>
            <article className="bg-white border border-gray-200 rounded-sm p-6">
              <p className="text-sm text-gray-600">Planes activos</p>
              <p className="text-2xl font-semibold text-gray-800 mt-2">
                {plans.items.filter((p) => p.isActive).length}
              </p>
            </article>
            <article className="bg-white border border-gray-200 rounded-sm p-6">
              <p className="text-sm text-gray-600">Productos</p>
              <p className="text-2xl font-semibold text-gray-800 mt-2">{products.items.length}</p>
            </article>
            <article className="bg-white border border-gray-200 rounded-sm p-6">
              <p className="text-sm text-gray-600">Serializados</p>
              <p className="text-2xl font-semibold text-gray-800 mt-2">
                {products.items.filter((p) => p.isSerialized).length}
              </p>
            </article>
          </section>

          <section className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab("plans")}
                className={
                  activeTab === "plans"
                    ? "bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D]"
                    : "bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72]"
                }
              >
                Planes ({plans.items.length})
              </button>
              <button
                onClick={() => setActiveTab("products")}
                className={
                  activeTab === "products"
                    ? "bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D]"
                    : "bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72]"
                }
              >
                Productos ({products.items.length})
              </button>

              {activeTab === "plans" ? (
                <button
                  onClick={openCreatePlan}
                  className="ml-auto bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D]"
                >
                  Nuevo plan
                </button>
              ) : (
                <button
                  onClick={openCreateProduct}
                  className="ml-auto bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D]"
                >
                  Nuevo producto
                </button>
              )}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-sm p-6">
            {activeTab === "plans" && (
              <>
                {plans.error && (
                  <div className="border border-gray-200 rounded-sm p-4 text-sm text-gray-700 mb-4">
                    {plans.error}
                    <button
                      onClick={loadPlans}
                      className="ml-3 bg-white border border-gray-200 text-gray-800 px-4 py-1 text-sm rounded-sm hover:border-[#002D72]"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
                {plans.loading ? (
                  <p className="text-sm text-gray-600">Cargando planes...</p>
                ) : plans.items.length === 0 ? (
                  <p className="text-sm text-gray-600">No hay planes registrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-3 text-sm text-gray-700 font-semibold">Nombre</th>
                          <th className="py-3 text-sm text-gray-700 font-semibold">Tipo</th>
                          <th className="py-3 text-sm text-gray-700 font-semibold">Precio</th>
                          <th className="py-3 text-sm text-gray-700 font-semibold">Estado</th>
                          <th className="py-3 text-sm text-gray-700 font-semibold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plans.items.map((plan) => (
                          <tr key={plan.id} className="border-b border-gray-200">
                            <td className="py-3 text-sm text-gray-600">{plan.name}</td>
                            <td className="py-3 text-sm text-gray-600">{PLAN_TYPE_LABELS[plan.type]}</td>
                            <td className="py-3 text-sm text-gray-600">{formatPrice(plan.price, plan.currency)}</td>
                            <td className="py-3 text-sm text-gray-600">{plan.isActive ? "Activo" : "Inactivo"}</td>
                            <td className="py-3 flex gap-2">
                              <button
                                onClick={() => openEditPlan(plan)}
                                className="bg-white border border-gray-200 text-gray-800 px-4 py-1 text-sm rounded-sm hover:border-[#002D72]"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => setDeletingPlan(plan)}
                                disabled={plans.deletingId === plan.id}
                                className="bg-white border border-gray-200 text-gray-800 px-4 py-1 text-sm rounded-sm hover:border-[#002D72] disabled:opacity-50"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === "products" && (
              <>
                {products.error && (
                  <div className="border border-gray-200 rounded-sm p-4 text-sm text-gray-700 mb-4">
                    {products.error}
                    <button
                      onClick={loadProducts}
                      className="ml-3 bg-white border border-gray-200 text-gray-800 px-4 py-1 text-sm rounded-sm hover:border-[#002D72]"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
                {products.loading ? (
                  <p className="text-sm text-gray-600">Cargando productos...</p>
                ) : products.items.length === 0 ? (
                  <p className="text-sm text-gray-600">No hay productos registrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-3 text-sm text-gray-700 font-semibold">Nombre</th>
                          <th className="py-3 text-sm text-gray-700 font-semibold">Categoria</th>
                          <th className="py-3 text-sm text-gray-700 font-semibold">Serializado</th>
                          <th className="py-3 text-sm text-gray-700 font-semibold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.items.map((product) => (
                          <tr key={product.id} className="border-b border-gray-200">
                            <td className="py-3 text-sm text-gray-600">{product.name}</td>
                            <td className="py-3 text-sm text-gray-600">{PRODUCT_CATEGORY_LABELS[product.category]}</td>
                            <td className="py-3 text-sm text-gray-600">{product.isSerialized ? "Si" : "No"}</td>
                            <td className="py-3 flex gap-2">
                              <button
                                onClick={() => openEditProduct(product)}
                                className="bg-white border border-gray-200 text-gray-800 px-4 py-1 text-sm rounded-sm hover:border-[#002D72]"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => setDeletingProduct(product)}
                                disabled={products.deletingId === product.id}
                                className="bg-white border border-gray-200 text-gray-800 px-4 py-1 text-sm rounded-sm hover:border-[#002D72] disabled:opacity-50"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <PlanFormModal
        open={planModal}
        plan={editingPlan}
        saving={plans.saving}
        onSave={handleSavePlan}
        onClose={() => {
          setPlanModal(false);
          setEditingPlan(null);
        }}
      />

      <ProductFormModal
        open={productModal}
        product={editingProduct}
        saving={products.saving}
        onSave={handleSaveProduct}
        onClose={() => {
          setProductModal(false);
          setEditingProduct(null);
        }}
      />

      <ConfirmDeleteModal
        open={Boolean(deletingPlan)}
        itemName={deletingPlan?.name ?? ""}
        deleting={plans.deletingId === deletingPlan?.id}
        onConfirm={handleDeletePlan}
        onClose={() => setDeletingPlan(null)}
      />

      <ConfirmDeleteModal
        open={Boolean(deletingProduct)}
        itemName={deletingProduct?.name ?? ""}
        deleting={products.deletingId === deletingProduct?.id}
        onConfirm={handleDeleteProduct}
        onClose={() => setDeletingProduct(null)}
      />
    </Layout>
  );
}
