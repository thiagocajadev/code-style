package com.example.scripts;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

// Demonstra os princípios de control-flow.md — ordem simples → complexo:
// if/else → ternário → guard clauses → switch expression → pattern matching
// → circuit break → for-each → while → do-while

public class ControlFlowExamples {

    // ─── If e else ────────────────────────────────────────────────────────────

    // ❌ Bad: else desnecessário após return
    private BigDecimal getDiscountBad(User user) {
        if (user.isPremium()) {
            return new BigDecimal("0.2");
        } else {
            return new BigDecimal("0.05");
        }
    }

    // ✅ Good: early return elimina o else
    private BigDecimal getDiscount(User user) {
        if (user.isPremium()) return new BigDecimal("0.2");
        return new BigDecimal("0.05");
    }

    // ─── Ternário ─────────────────────────────────────────────────────────────

    // ❌ Bad: ternário encadeado ilegível
    private String getGradeBad(int score) {
        return score >= 90 ? "A"
            : score >= 80 ? "B"
            : score >= 70 ? "C"
            : score >= 60 ? "D"
            : "F";
    }

    // ✅ Good: ternário para dois valores; guard clauses para 3+
    private String getLabelSimple(User user) {
        final var label = user.isPremium() ? "Premium" : "Standard";
        return label;
    }

    private String getGrade(int score) {
        if (score >= 90) return "A";
        if (score >= 80) return "B";
        if (score >= 70) return "C";
        if (score >= 60) return "D";
        return "F";
    }

    // ─── Guard clauses — aninhamento em cascata ───────────────────────────────

    // ❌ Bad: lógica enterrada em múltiplos níveis
    private Invoice processOrderBad(Order order) {
        if (order != null) {
            if (order.isActive()) {
                if (!order.getItems().isEmpty()) {
                    if (order.getCustomer() != null) {
                        return process(order);
                    }
                }
            }
        }
        return null;
    }

    // ✅ Good: guard clauses, caminho feliz ao fundo
    private Invoice processOrder(Order order) {
        if (order == null) return null;
        if (!order.isActive()) return null;

        if (order.getItems().isEmpty()) return null;
        if (order.getCustomer() == null) return null;

        final var invoice = process(order);
        return invoice;
    }

    // ─── Switch expression — lookup de valor ──────────────────────────────────

    // ❌ Bad: switch tradicional verboso com fall-through implícito
    private String getStatusLabelBad(OrderStatus status) {
        String label;
        switch (status) {
            case PENDING:
                label = "Pending review";
                break;
            case APPROVED:
                label = "Approved";
                break;
            default:
                label = "Unknown";
        }
        return label;
    }

    // ✅ Good: switch expression — sem fall-through, sem break
    private String getStatusLabel(OrderStatus status) {
        final var label = switch (status) {
            case PENDING   -> "Pending review";
            case APPROVED  -> "Approved";
            case REJECTED  -> "Rejected";
            case CANCELLED -> "Cancelled";
        };
        return label;
    }

    // ─── Switch — despacho de ações ───────────────────────────────────────────

    // ✅ Good: switch com bloco para múltiplas ações por caso
    private void processPaymentEvent(PaymentEvent event) {
        switch (event.type()) {
            case SUCCESS -> {
                sendReceipt(event.orderId());
                updateOrderStatus(event.orderId(), "paid");
            }
            case FAILED -> {
                notifyFailure(event.userId());
                scheduleRetry(event.orderId());
            }
            case REFUNDED -> {
                sendRefundConfirmation(event.userId());
                updateOrderStatus(event.orderId(), "refunded");
            }
        }
    }

    // ─── Pattern matching — tipo e desestruturação ────────────────────────────

    // ❌ Bad: instanceof + cast manual
    private String describePaymentBad(PaymentResult result) {
        if (result instanceof PaymentSuccess) {
            final var success = (PaymentSuccess) result;
            return "Paid: " + success.amount();
        } else if (result instanceof PaymentFailure) {
            final var failure = (PaymentFailure) result;
            return "Failed: " + failure.reason();
        }
        return "Unknown";
    }

    // ✅ Good: pattern matching com desestruturação; sealed garante exaustividade
    private String describePayment(PaymentResult result) {
        final var description = switch (result) {
            case PaymentSuccess s  -> "Paid: " + s.amount();
            case PaymentFailure f  -> "Failed: " + f.reason();
            case PaymentPending p  -> "Pending: " + p.transactionId();
        };
        return description;
    }

    // ─── Circuit break ────────────────────────────────────────────────────────

    // ❌ Bad: loop manual com flag percorre tudo
    private Product findFirstExpiredProductBad(List<Product> products) {
        Product expiredProduct = null;
        for (final var product : products) {
            if (expiredProduct == null && product.isExpired()) {
                expiredProduct = product;
            }
        }
        return expiredProduct;
    }

    // ✅ Good: stream para no primeiro match
    private void circuitBreakExamples(List<Product> products) {
        final var expiredProduct   = products.stream().filter(Product::isExpired).findFirst();
        final var hasExpiredProduct = products.stream().anyMatch(Product::isExpired);
        final var allProductsActive = products.stream().allMatch(Product::isActive);
    }

    // ─── for-each ─────────────────────────────────────────────────────────────

    // ❌ Bad: for indexado quando o índice nunca é usado
    private void notifyAllBad(List<Order> orders) {
        for (int i = 0; i < orders.size(); i++) {
            notifyCustomer(orders.get(i));
        }
    }

    // ✅ Good: for-each para efeitos colaterais por item
    private void notifyAll(List<Order> orders) {
        for (final var order : orders) {
            notifyCustomer(order);
        }
    }

    // ─── while ────────────────────────────────────────────────────────────────

    // ❌ Bad: for simulando condição de parada por estado
    private void connectBad(int maxAttempts) {
        for (int attempt = 0; attempt < maxAttempts; attempt++) {
            final var connection = connectToDatabase();
            if (connection.isReady()) break;
        }
    }

    // ✅ Good: while para condição de parada por estado
    private void connect(int maxAttempts) {
        var attempt = 0;

        while (attempt < maxAttempts) {
            final var connection = connectToDatabase();
            if (connection.isReady()) break;

            attempt++;
        }
    }

    // ─── do-while ─────────────────────────────────────────────────────────────

    // ❌ Bad: while quando a fila deve processar ao menos um item
    private void drainQueueBad(TaskQueue taskQueue) {
        while (!taskQueue.isEmpty()) {
            final var task = taskQueue.dequeue();
            executeTask(task);
        }
    }

    // ✅ Good: do-while quando a primeira execução é garantida
    private void drainQueue(TaskQueue taskQueue) {
        do {
            final var task = taskQueue.dequeue();
            executeTask(task);
        } while (!taskQueue.isEmpty());
    }
}
