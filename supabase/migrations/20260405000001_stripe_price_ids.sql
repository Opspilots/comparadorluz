BEGIN;

-- Stripe price IDs for Standard and Professional plans
UPDATE plans
SET
    stripe_price_monthly_id = 'price_1TIo784HwjX2BwWfp4g4QnuL',
    stripe_price_yearly_id  = 'price_1TIy9R4HwjX2BwWfYEsjTy5A'
WHERE name = 'standard';

UPDATE plans
SET
    stripe_price_monthly_id = 'price_1TIo7Z4HwjX2BwWf0zWjmzEd',
    stripe_price_yearly_id  = 'price_1TIyEF4HwjX2BwWfXXy70TUY'
WHERE name = 'professional';

COMMIT;
