import React from "react";
import type { Product } from "../../types/product";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  return (
    <article className="bg-white border border-gray-200 rounded-sm p-6 flex flex-col">
      <p className="text-xs text-gray-500">{product.category}</p>
      <h3 className="text-2xl font-semibold text-gray-800 mt-2">{product.name}</h3>
      <div className="mt-4 space-y-1">
        <p className="text-sm text-gray-600">ID: {product.id}</p>
        <p className="text-sm text-gray-600">
          {product.isSerialized ? "Serializado" : "No serializado"}
        </p>
      </div>
      <button
        onClick={() => onSelect(product)}
        className="mt-6 bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D]"
      >
        Ver detalle
      </button>
    </article>
  );
};
