from app.models import linear_regression, moving_average

# Dipakai main.py dan evaluation.py supaya nama model di request (string) tidak perlu
# if/elif berulang di banyak tempat.
MODEL_REGISTRY = {
    "moving_average": moving_average.forecast,
    "linear_regression": linear_regression.forecast,
}
