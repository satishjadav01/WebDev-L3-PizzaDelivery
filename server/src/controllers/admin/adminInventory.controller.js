import { toInventoryDto } from '../../presenters/catalog.presenter.js';

export function createAdminInventoryController({ inventoryService }) {
  return {
    async list(_req, res) {
      const items = await inventoryService.listForAdmin();
      res.json({ items: items.map(toInventoryDto) });
    },

    async update(req, res) {
      const { id } = req.valid.params;
      const { quantity, threshold } = req.valid.body;
      if (threshold !== undefined) await inventoryService.setThreshold({ id, threshold });
      const updated =
        quantity !== undefined
          ? await inventoryService.setQuantity({ id, quantity })
          : await inventoryService.getItem(id);
      res.json({
        item: toInventoryDto({ item: updated, isLow: updated.quantity < updated.threshold }),
      });
    },
  };
}
