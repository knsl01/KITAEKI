-- Migration for KITA App Features

-- 1. Add `is_manual` to `recurring_transactions` for unpredictable bills
ALTER TABLE public.recurring_transactions
ADD COLUMN is_manual BOOLEAN NOT NULL DEFAULT false;

-- 2. Add `image_url` to `savings_goals` for the Wishlist Flip Card feature
ALTER TABLE public.savings_goals
ADD COLUMN image_url TEXT;

-- 3. We also need to add `url`, `price`, `priority` to `savings_goals` since Wishlist is merging into Savings.
ALTER TABLE public.savings_goals
ADD COLUMN item_url TEXT,
ADD COLUMN item_price NUMERIC,
ADD COLUMN priority TEXT DEFAULT 'medium';
