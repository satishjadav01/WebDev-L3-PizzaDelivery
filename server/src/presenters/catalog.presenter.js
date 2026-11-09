const toOptionDto = ({ item, inStock }) => ({
  id: String(item._id),
  name: item.name,
  priceMinor: item.priceMinor,
  inStock,
});

export function toMenuDto({ pizza, inStock }) {
  return {
    id: String(pizza._id),
    name: pizza.name,
    description: pizza.description,
    imageUrl: pizza.imageUrl,
    priceMinor: pizza.priceMinor,
    inStock,
    ingredients: pizza.ingredients.map((ingredient) => ({
      name: ingredient.name,
      category: ingredient.category,
    })),
  };
}

export function toBuilderStepDto(step) {
  return {
    category: step.category,
    label: step.label,
    step: step.step,
    min: step.selection.min,
    max: step.selection.max,
    options: step.options.map(toOptionDto),
  };
}

export function toInventoryDto({ item, isLow }) {
  return {
    id: String(item._id),
    key: item.key,
    category: item.category,
    name: item.name,
    priceMinor: item.priceMinor,
    quantity: item.quantity,
    threshold: item.threshold,
    isLow,
    isActive: item.isActive,
    updatedAt: item.updatedAt,
  };
}
