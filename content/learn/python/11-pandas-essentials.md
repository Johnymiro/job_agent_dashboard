---
title: pandas essentials
summary: Selecting rows, vectorised maths, groupby with agg vs transform, safe merges, missing data, and working with files bigger than memory.
level: intermediate
---

pandas is the default tool for tabular data in Python. Most pandas problems in tests and in production are about three things: selecting the right rows, aggregating correctly, and not blowing up memory or row counts.

## Series, DataFrame, index

A **Series** is a labelled column; a **DataFrame** is a table of Series sharing one **index** (the row labels). Operations line up rows **by index label**, not by position, which is powerful and occasionally surprising.

```python
import numpy as np
import pandas as pd

df = pd.DataFrame({
    "desk": ["FX", "FX", "Rates", "Credit"],
    "side": ["BUY", "SELL", "BUY", "BUY"],
    "notional": [100, 300, 50, 80],
})
```

## Selecting

```python
df["notional"]                    # one column → Series
df[["desk", "notional"]]          # several columns → DataFrame
df.loc[0, "desk"]                 # by label
df.iloc[0, 0]                     # by position
df.loc[df["notional"] > 90]       # boolean mask

df.loc[(df["desk"] == "FX") & (df["side"] == "BUY")]   # & | ~, with parentheses
df.loc[df["desk"].isin(["FX", "Rates"])]
df.query("notional > 90 and side == 'BUY'")             # same idea, as a string
```

> **Pitfall:** Use `&`, `|` and `~`, never `and` / `or` / `not`, and wrap every condition in parentheses. `&` binds tighter than `==`, so `df.a == 1 & df.b == 2` is parsed as `df.a == (1 & df.b) == 2`, which gives wrong results or raises.

To change values, select and assign in one `.loc` call: `df.loc[df["notional"] < 0, "flag"] = True`. Chained assignment like `df[mask]["flag"] = True` modifies a temporary copy. With Copy-on-Write (opt-in in pandas 2.x and the default from pandas 3.0) it never touches `df`.

## Vectorise; don't loop

Column operations run in optimised C. Row loops run in Python, often 100× slower.

```python
df["fee"] = df["notional"] * 0.001                          # vectorised
df["size"] = np.where(df["notional"] >= 100, "big", "small")
df["desk_lower"] = df["desk"].str.lower()                   # .str for strings
df["month"] = pd.to_datetime(df["date"]).dt.to_period("M")  # .dt for dates

# avoid: for _, row in df.iterrows(): ...
# avoid: df.apply(lambda r: r["notional"] * 0.001, axis=1)
```

## groupby: `agg` vs `transform`

```python
df.groupby("desk")["notional"].sum()           # one row per desk
df.groupby("desk").agg(                         # named aggregations
    total=("notional", "sum"),
    trades=("notional", "size"),
    largest=("notional", "max"),
)

# transform: same length as df, aligned to the original rows
df["desk_total"] = df.groupby("desk")["notional"].transform("sum")
df["share"] = df["notional"] / df["desk_total"]
```

Use `agg` (or `.sum()`, `.mean()`) to **summarise** groups. Use `transform` to **attach** a group statistic to every row, for example a share of total or a z-score within each group.

## merge without surprises

```python
trades.merge(prices, on="isin", how="left", validate="many_to_one", indicator=True)
```

- `how`: `inner` (only matches), `left` (keep all left rows), `right`, `outer`.
- **Duplicate keys multiply rows.** If an ISIN appears twice on each side, the merge produces 4 rows for it. `validate="many_to_one"` raises instead of silently exploding.
- `indicator=True` adds a `_merge` column (`both`, `left_only`, `right_only`), handy for reconciliation.

## Missing data

```python
df["price"].isna()               # True where missing (NaN / None / NaT)
df["price"].fillna(0)
df.dropna(subset=["price"])
df["price"].mean()               # NaN is skipped by default
```

`NaN != NaN`, so `df[df["price"] == np.nan]` matches nothing. Always use `isna()`.

## Bigger than memory

```python
cols = ["isin", "desk", "notional"]
dtypes = {"desk": "category", "notional": "float32"}

totals = []
for chunk in pd.read_csv("trades.csv", usecols=cols, dtype=dtypes, chunksize=200_000):
    totals.append(chunk.groupby("desk", observed=True)["notional"].sum())
result = pd.concat(totals).groupby(level=0).sum()     # combine partial sums
```

`usecols` and smaller `dtype`s (especially `category` for repeated strings) often cut memory several times over. Parquet loads faster and keeps types. For very large data, DuckDB or Polars can query files directly.

## Key points

- Boolean masks use `&`, `|`, `~` with parentheses around each condition.
- Assign with one `df.loc[mask, col] = value`, never chained indexing.
- Vectorise column maths; avoid `iterrows` and row-wise `apply`.
- `groupby().agg()` gives one row per group; `transform()` keeps the original rows.
- Duplicate keys multiply rows in a merge; use `validate=` to catch it.
- `isna()` for missing values; chunk, `usecols` and `category` for big files.

## Quick check

**Q:** Which line selects FX trades with notional over 100?

- [ ] `df[df.desk == "FX" and df.notional > 100]`
- [ ] `df[df.desk == "FX" & df.notional > 100]`
- [x] `df[(df.desk == "FX") & (df.notional > 100)]`
- [ ] `df[df.desk == "FX"][df.notional > 100] = True`

> `and` can't combine two Series ("truth value is ambiguous"), and without parentheses `&` binds before `==` and `>`. Each comparison needs its own parentheses, joined with `&`.

**Q:** `trades` has ISIN `A` twice and `B` once. `prices` has `A` twice and `B` once. How many rows does `trades.merge(prices, on="isin")` return?

- [ ] 3
- [ ] 4
- [x] 5
- [ ] 6

> An inner merge pairs every matching row: `A` gives 2 × 2 = 4 rows and `B` gives 1 × 1 = 1, so 5 in total. Passing `validate="many_to_one"` would have raised, because `prices` isn't unique on `isin`.

**Q:** Which returns one row per desk with the summed notional?

- [x] `df.groupby("desk")["notional"].sum()`
- [ ] `df.groupby("desk")["notional"].transform("sum")`
- [ ] `df["notional"].sum()`
- [ ] `df.sort_values("desk")["notional"].cumsum()`

> Aggregations like `.sum()` collapse each group to one row, indexed by desk. `transform("sum")` returns the group total on every original row, and `df["notional"].sum()` is the grand total.
