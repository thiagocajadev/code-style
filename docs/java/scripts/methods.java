package com.example.scripts;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

// Demonstra os princípios de methods.md:
// - God method → orquestrador + helpers
// - SLA: orquestrador OU implementação, nunca os dois
// - Direct return
// - Sem lógica no retorno

public class MethodsExamples {

    // ─── God method ───────────────────────────────────────────────────────────

    // ❌ Bad: busca, valida, calcula, persiste e loga na mesma função
    public Order realizaVendaBad(String id) {
        Order p = orderRepository.findById(id).orElse(null);
        Order resultado = null;

        if (p != null) {
            if (p.getItems() != null && !p.getItems().isEmpty()) {
                if (!p.getCustomer().isDefaulted()) {
                    if (p.getTotal().compareTo(new BigDecimal("100")) > 0) {
                        p.setDiscount(BigDecimal.TEN);
                    } else {
                        p.setDiscount(BigDecimal.ZERO);
                    }
                    p.setTotal(p.getTotal().subtract(p.getDiscount()));
                    resultado = orderRepository.save(p);
                    System.out.println("Log qualquer");
                } else {
                    System.out.println("cliente inadimplente: " + p.getCustomer().getName());
                    resultado = null;
                }
            }
        }

        return resultado;
    }

    // ✅ Good: orquestrador no topo, responsabilidades separadas
    public Order processOrder(String orderId) {
        final var order = fetchOrder(orderId);
        if (isInvalid(order)) return null;

        final var invoice = issueInvoice(order);
        return invoice;
    }

    private Order fetchOrder(String orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
    }

    private boolean isInvalid(Order order) {
        if (order.getItems().isEmpty()) return true;
        if (order.getCustomer().isDefaulted()) {
            notifyDefault(order);
            return true;
        }
        return false;
    }

    private Order issueInvoice(Order order) {
        final var discountedOrder = applyDiscount(order);
        final var invoice = orderRepository.save(discountedOrder);
        return invoice;
    }

    // ─── SLA: orquestrador ou implementação ───────────────────────────────────

    // ❌ Bad: mesmo método orquestra e implementa
    public String buildOrderSummaryBad(Order order) {
        final var header = "Order #" + order.getId();
        final var lineItems = order.getItems().stream()
            .map(item -> "  - " + item.getName() + ": $" + item.getPrice())
            .collect(Collectors.joining("\n"));

        return header + "\n" + lineItems;
    }

    // ✅ Good: orquestrador chama helpers, cada um faz uma coisa
    public String buildOrderSummary(Order order) {
        final var header = buildHeader(order);
        final var lineItems = buildLineItems(order);

        final var summary = header + "\n" + lineItems;
        return summary;
    }

    private String buildHeader(Order order) {
        final var header = "Order #" + order.getId();
        return header;
    }

    private String buildLineItems(Order order) {
        final var lines = order.getItems().stream()
            .map(item -> "  - " + item.getName() + ": $" + item.getPrice());
        final var lineItems = lines.collect(Collectors.joining("\n"));
        return lineItems;
    }

    // ─── Direct return ────────────────────────────────────────────────────────

    // ❌ Bad: variável auxiliar desnecessária, else após throw
    public Product findProductByIdBad(String id) {
        Product productFound = null;

        final var result = productRepository.findById(id);

        if (result.isEmpty()) {
            throw new NotFoundException("Product not found.");
        } else {
            productFound = result.get();
        }

        return productFound;
    }

    // ✅ Good: intenção clara no topo, detalhe abaixo
    public Product findProductById(String id) {
        final var product = fetchProduct(id);
        return product;
    }

    private Product fetchProduct(String id) {
        final var product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product " + id + " not found."));
        return product;
    }

    // ─── Sem lógica no retorno ────────────────────────────────────────────────

    // ❌ Bad: lógica inline no return
    public String buildGreetingBad(User user) {
        return "Hello, " + user.getName() + "! You have " + user.getNotifications().size() + " notifications.";
    }

    // ✅ Good: variável expressiva antes do return
    public String buildGreeting(User user) {
        final var greeting = "Hello, %s! You have %d notifications."
            .formatted(user.getName(), user.getNotifications().size());
        return greeting;
    }

    // ─── Parâmetros: record para 4+ ───────────────────────────────────────────

    // ❌ Bad: 4+ parâmetros inline
    private Invoice createInvoiceBad(String orderId, String customerId, BigDecimal amount, String dueDate, String currency) {
        return null;
    }

    // ✅ Good: record para 4+ parâmetros
    record InvoiceRequest(String orderId, String customerId, BigDecimal amount, String dueDate, String currency) {}

    private Invoice createInvoice(InvoiceRequest request) {
        return null;
    }
}
