import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const dataPath = path.join(__dirname, '../../../../seed-data.json');

export const getCatalog = async (req: Request, res: Response) => {
  try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    
    res.json(data.products);
  } catch (error) {
    res.status(500).json({ message: 'Error al leer el catálogo' });
  }
};

export const getProductDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    
    const product = data.products.find((p: any) => p.id === id);
    const inventory = data.inventory.filter((inv: any) => inv.productId === id);
    
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({ ...product, inventory });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalle' });
  }
};