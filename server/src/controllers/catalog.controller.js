import { toBuilderStepDto, toMenuDto } from '../presenters/catalog.presenter.js';

export function createCatalogController({ catalogService }) {
  return {
    async menu(_req, res) {
      const menu = await catalogService.listMenu();
      res.json({ pizzas: menu.map(toMenuDto) });
    },

    async builder(_req, res) {
      const steps = await catalogService.getBuilderSteps();
      res.json({ steps: steps.map(toBuilderStepDto) });
    },
  };
}
