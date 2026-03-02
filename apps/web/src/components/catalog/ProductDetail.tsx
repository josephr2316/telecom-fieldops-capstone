import React from "react";
import type { Product } from "../../types/product";

interface ProductDetailProps {
  product: Product;
  onClose: () => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ product, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{product.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{product.id}</p>
          </div>
          <button
            onClick={onClose}
            className="bg-white border border-gray-200 text-gray-800 px-4 py-2 text-sm rounded-sm hover:border-[#002D72]"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-sm text-gray-700">Categoria</p>
            <p className="text-sm text-gray-600 mt-1">{product.category.replace("_", " ")}</p>
          </div>

          {product.description && (
            <div>
              <p className="text-sm text-gray-700">Descripcion</p>
              <p className="text-sm text-gray-600 mt-1">{product.description}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-700">Control de inventario</p>
            <p className="text-sm text-gray-600 mt-1">
              {product.isSerialized ? "Serializado (requiere numero de serie)" : "No serializado"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
