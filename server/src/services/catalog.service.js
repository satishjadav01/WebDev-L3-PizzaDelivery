/** Read models for the customer dashboard and the custom pizza builder. */
export function createCatalogService({ pizzaRepository, inventoryRepository, inventoryConfig }) {
  const { categories } = inventoryConfig;
  const hasStock = (item) =>
    item.isActive && item.quantity >= categories[item.category].unitsPerPizza;

  return {
    async listMenu() {
      const pizzas = await pizzaRepository.listAvailable();
      return pizzas.map((pizza) => ({
        pizza,
        inStock: pizza.ingredients.every(hasStock),
      }));
    },

    /** One entry per builder step, in the order the customer walks through them. */
    async getBuilderSteps() {
      const items = await inventoryRepository.listActive();
      return Object.entries(categories)
        .sort(([, a], [, b]) => a.builderStep - b.builderStep)
        .map(([category, rules]) => ({
          category,
          label: rules.label,
          step: rules.builderStep,
          selection: rules.selection,
          options: items
            .filter((item) => item.category === category)
            .map((item) => ({ item, inStock: hasStock(item) })),
        }));
    },
  };
}
