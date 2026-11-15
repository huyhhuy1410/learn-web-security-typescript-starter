import { Router } from "express";
import type { Dependencies } from "../dependencies.ts";
import { getCurrentSession } from "../auth/sessions.ts";
import {
  findOrderById,
  listAllOrders,
  listOrderItems,
  listOrdersForUser,
  type Order,
  type OrderItem,
} from "../orders/index.ts";
import { listPublicProducts, type Product } from "../products.ts";
import { findApiKey } from "../auth/apiKeys.ts";
import {
  sendApiKeyQuotaExhausted,
  setApiKeyQuotaHeaders,
  toApiKeyQuotaResponse,
} from "./apiKeyQuota.ts";
import { consumeApiKeyQuota } from "../auth/apiKeyUsage.ts";
type ProductResponse = {
  id: number;
  name: string;
  description: string;
  image_path: string;
  price_cents: number;
};

type OrderResponse = {
  id: number;
  status: Order["status"];
  total_cents: number;
  created_at: string;
};

type OrderItemResponse = {
  product_id: number;
  product_name: string;
  quantity: number;
  price_cents: number;
};
function toProductResponse(obj: Product): ProductResponse {
  return {
    id: obj.id,
    name: obj.name,
    description: obj.description,
    image_path: obj.image_path,
    price_cents: obj.price_cents,
  };
}
function toOrderResponse(obj: Order): OrderResponse {
  return {
    id: obj.id,
    status: obj.status,
    total_cents: obj.total_cents,
    created_at: obj.created_at,
  };
}
function toOrderItemResponse(obj: OrderItem): OrderItemResponse {
  return {
    product_id: obj.product_id,
    product_name: obj.product_name,
    quantity: obj.quantity,
    price_cents: obj.price_cents,
  };
}
export function createApiRouter(deps: Dependencies): Router {
  const { db } = deps;
  const router = Router();

  router.get("/api/account/orders", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    res.json({
      orders: listOrdersForUser(db, current.user.id).map(toOrderResponse),
    });
  });

  router.get("/api/orders/:id", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const orderId = Number(req.params.id);
    if (!Number.isSafeInteger(orderId)) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = findOrderById(db, orderId);
    if (!order || order.id !== current.user.id) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({
      order: toOrderResponse(order),
      items: listOrderItems(db, order.id).map(toOrderItemResponse),
    });
  });

  router.get("/api/products", (_req, res) => {
    res.json({
      products: listPublicProducts(db, deps.maxPublicProductResults).map(
        toProductResponse,
      ),
    });
  });

  router.get("/api/integrations/warehouse/orders", (req, res) => {
    const apiKey = req.header("x-api-key");
    if (!apiKey || typeof apiKey !== "string") {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const validKey = findApiKey(db, apiKey);
    if (!validKey) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (validKey.scope !== "orders:read") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const quota = consumeApiKeyQuota(db, validKey.id);
    if (!quota.allowed) {
      sendApiKeyQuotaExhausted(res, quota);
      return;
    }
    setApiKeyQuotaHeaders(res, quota);
    const orders = listAllOrders(db).map((order) => ({
      id: order.id,
      status: order.status,
      total_cents: order.total_cents,
      created_at: order.created_at,
    }));

    res.json({
      integration: "Warehouse Fulfillment Integration",
      orders,
      quota: toApiKeyQuotaResponse(quota),
    });
  });

  return router;
}
