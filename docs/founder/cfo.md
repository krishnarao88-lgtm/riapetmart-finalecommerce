# Unit economics: Ria Pet Mart website (riapetmart.com) - online orders only, store sales excluded

Every number below comes from the input file. Nothing is looked up or guessed.

## One order

| line | per order |
| --- | ---: |
| Price | $133.72 |
| Products at cost (72% of RM131.80 basket, median gross margin 28.1%) | -$94.77 |
| Courier (EasyParcel/Lalamove, real avg of 3 orders) | -$6.08 |
| Stripe fee (real avg of 3 orders) | -$5.01 |
| Box, tape, filler (estimate) | -$1.00 |
| **Contribution** (what each order leaves to pay the fixed costs) | **$26.86** (20%) |

## The margin that matters

Fixed costs: $405 a month (Meta ads (owner budget) $200, Vercel + Supabase + email (estimate) $205).

- **Break-even: 1 orders a day.** Below that you lose money every month.
- **Profit margin at your plan** (10 a day): **19%** of every sale, after every cost.

## Year 1, month by month

| month | orders a day | revenue | profit | cumulative (after $0 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | $2,006 | -$2 | -$2 |
| 2 | 2 | $8,023 | $1,207 | $1,204 |
| 3 | 4 | $16,046 | $2,818 | $4,023 |
| 4 | 4 | $16,046 | $2,818 | $6,841 |
| 5 | 5 | $20,058 | $3,624 | $10,465 |
| 6 | 6 | $24,070 | $4,430 | $14,895 |
| 7 | 7 | $28,081 | $5,236 | $20,130 |
| 8 | 8 | $32,093 | $6,041 | $26,172 |
| 9 | 8 | $32,093 | $6,041 | $32,213 |
| 10 | 9 | $36,104 | $6,847 | $39,060 |
| 11 | 10 | $40,116 | $7,653 | $46,713 |
| 12 | 10 | $40,116 | $7,653 | $54,366 |

- **Year 1 operating profit: $54,366** on $294,853 of revenue.
- After the $0 startup spend: $54,366.
- Startup money earned back: month 2.
- Cash you need before it pays for itself: **$2**.

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 19% | 1 | $54,366 |
| Price -10% | 10% | 2 | $24,881 |
| Volume -20% | 19% | 1 | $42,521 |
| Unit costs +15% | 7% | 2 | $19,022 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.
