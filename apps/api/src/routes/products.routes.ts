import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { productsService } from '../domain/services/products.service';
import { validateBody, validateParams } from '../middleware/validate';

const router = Router();

const productCategorySchema = z.enum([
  'ROUTER',
  'MODEM',
  'ONT',
  'STB',
  'ANTENNA',
  'CABLE',
  'PHONE',
  'TABLET',
  'LAPTOP',
  'SIM',
]);

const productIdParamsSchema = z.object({
  id: z.string().min(1),
});

const createProductSchema = z.object({
  name: z.string().min(1),
  category: productCategorySchema,
  isSerialized: z.boolean(),
});

const updateProductSchema = z
  .object({
    name: z.string().min(1).optional(),
    category: productCategorySchema.optional(),
    isSerialized: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

/** GET /products: list all products. */
router.get('/products', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await productsService.listProducts());
  } catch (error) {
    next(error);
  }
});

/** GET /products/:id: get product by id. */
router.get('/products/:id', validateParams(productIdParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await productsService.getProductById(req.params.id));
  } catch (error) {
    next(error);
  }
});

/** POST /products: create product. */
router.post('/products', validateBody(createProductSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await productsService.createProduct(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

/** PATCH /products/:id: update product. */
router.patch('/products/:id', validateParams(productIdParamsSchema), validateBody(updateProductSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await productsService.updateProduct(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/** DELETE /products/:id: delete product. */
router.delete('/products/:id', validateParams(productIdParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productsService.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
