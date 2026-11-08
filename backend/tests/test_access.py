def test_business_endpoints_require_login(client):
    response = client.get("/api/v1/businesses/1/products")
    assert response.status_code == 401
    assert "login" in response.json()["detail"].lower()

    response = client.post("/api/v1/businesses/1/ai/analyze")
    assert response.status_code == 401


def test_cross_business_access_is_denied(
    client, owner_factory, product_factory
):
    session_a, headers_a = owner_factory("Toko A")
    session_b, headers_b = owner_factory("Toko B")
    business_a = session_a["business_id"]
    business_b = session_b["business_id"]

    assert business_a != business_b
    product_a = product_factory(headers_a, business_a, name="Produk A", stock=5)

    endpoints = [
        ("get", f"/api/v1/businesses/{business_a}/products"),
        ("get", f"/api/v1/businesses/{business_a}/sales"),
        ("get", f"/api/v1/businesses/{business_a}/reports/dashboard"),
        ("get", f"/api/v1/businesses/{business_a}/expenses"),
        ("post", f"/api/v1/businesses/{business_a}/ai/analyze"),
    ]

    for method, url in endpoints:
        response = getattr(client, method)(url, headers=headers_b)
        assert response.status_code == 404, f"{method.upper()} {url}: {response.text}"

    create_response = client.post(
        f"/api/v1/businesses/{business_a}/products/",
        headers=headers_b,
        json={
            "name": "Penyusup",
            "selling_price": "1000.00",
            "cost_price": "500.00",
            "stock": 1,
        },
    )
    assert create_response.status_code == 404

    own_products = client.get(
        f"/api/v1/businesses/{business_b}/products", headers=headers_b
    )
    assert own_products.status_code == 200
    assert own_products.json() == []
