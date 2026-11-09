import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogApi } from '../../api/catalog.api.js';
import { ROUTES } from '../../config/routes.js';
import { useCart } from '../../context/CartContext.jsx';
import { builderStepsFixture } from '../../test/fixtures.js';
import { renderWithProviders } from '../../test/render.jsx';
import { BuilderPage } from './BuilderPage.jsx';

function CartProbe() {
  const { entries } = useCart();
  return <pre data-testid="cart">{JSON.stringify(entries.map((e) => e.itemIds))}</pre>;
}

function renderBuilder() {
  return renderWithProviders(
    <Routes>
      <Route path={ROUTES.builder} element={<BuilderPage />} />
      <Route path={ROUTES.cart} element={<CartProbe />} />
    </Routes>,
    { route: ROUTES.builder },
  );
}

beforeEach(() => {
  vi.spyOn(catalogApi, 'builder').mockResolvedValue({ steps: builderStepsFixture });
});

const choose = async (name) =>
  userEvent.click(await screen.findByRole('radio', { name: new RegExp(name) }));
const next = () => userEvent.click(screen.getByRole('button', { name: /^Next/ }));

describe('pizza builder', () => {
  it('blocks Next until the required choice is made', async () => {
    renderBuilder();
    const nextButton = await screen.findByRole('button', { name: /^Next/ });
    expect(nextButton).toBeDisabled();

    await choose('Thin Crust');
    expect(nextButton).toBeEnabled();
  });

  it('shows sold-out options as unavailable', async () => {
    renderBuilder();
    await choose('Thin Crust');
    await next();
    expect(screen.getByRole('radio', { name: /Barbecue/ })).toBeDisabled();
    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });

  it('caps vegetables at the step maximum and says how many are chosen', async () => {
    renderBuilder();
    await choose('Thin Crust');
    await next();
    await choose('Pesto');
    await next();
    await choose('Mozzarella');
    await next();

    await userEvent.click(screen.getByRole('checkbox', { name: /Onion/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Olives/ }));

    expect(screen.getByText(/2 of 2 chosen/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Corn/ })).toBeDisabled();
    // Already chosen options stay clickable so they can be removed.
    expect(screen.getByRole('checkbox', { name: /Onion/ })).toBeEnabled();
  });

  it('estimates the price from the fee and chosen options', async () => {
    renderBuilder();
    await choose('Cheese Burst');
    const summary = screen.getByRole('complementary', { name: /your pizza so far/i });
    // fee 5000 + base 12000 = 17000 paise
    expect(within(summary).getByText(/170\.00/)).toBeInTheDocument();
  });

  it('adds the finished pizza to the cart and moves on', async () => {
    renderBuilder();
    await choose('Thin Crust');
    await next();
    await choose('Pesto');
    await next();
    await choose('Mozzarella');
    await next();
    await userEvent.click(screen.getByRole('checkbox', { name: /Onion/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }));

    expect(JSON.parse((await screen.findByTestId('cart')).textContent)).toEqual([
      ['b1', 's1', 'c1', 'v1'],
    ]);
  });
});
