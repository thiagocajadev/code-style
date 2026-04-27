package com.example.scripts;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// Demonstra os princípios de variables.md:
// - final por padrão
// - Sem mutação de parâmetros
// - Sem valores mágicos
// - Records para dados imutáveis
// - var quando o tipo é óbvio

public class VariablesExamples {

    // ─── Constantes ───────────────────────────────────────────────────────────

    private static final int MINIMUM_DRIVING_AGE = 18;
    private static final int ORDER_STATUS_APPROVED = 2;
    private static final long ONE_DAY_MS = 86_400_000L;
    private static final int MAX_RETRY_ATTEMPTS = 3;

    // ─── final por padrão ─────────────────────────────────────────────────────

    // ❌ Bad: variável reatribuída sem necessidade
    public void mutationBad() {
        String userName = "Alice";
        int maxRetries = 3;
        // userName e maxRetries nunca reatribuídos
    }

    // ✅ Good: final por padrão, mutável só quando necessário
    public void mutationGood() {
        final var userName = "Alice";
        final var maxRetries = MAX_RETRY_ATTEMPTS;

        var attempt = 0;
        while (attempt < maxRetries) {
            attempt++;
        }
    }

    // ─── Mutação de parâmetros ────────────────────────────────────────────────

    // ❌ Bad: mutação do parâmetro recebido
    private void applyDiscountBad(Order order) {
        order.setDiscount(BigDecimal.TEN);
        order.setTotal(order.getTotal().subtract(BigDecimal.TEN));
    }

    // ✅ Good: retorna novo estado, sem efeitos colaterais
    private Order applyDiscount(Order order) {
        final var discount = BigDecimal.TEN;
        final var discountedTotal = order.getTotal().subtract(discount);

        final var discountedOrder = order.withDiscount(discount).withTotal(discountedTotal);
        return discountedOrder;
    }

    // ─── Valores mágicos ──────────────────────────────────────────────────────

    // ❌ Bad: o que significa 18? e 86400000?
    public void magicValuesBad(User user, Order order) {
        if (user.getAge() >= 18) { /* ... */ }
        if (order.getStatus() == 2) { /* ... */ }
    }

    // ✅ Good: constantes nomeadas
    public void magicValuesGood(User user, Order order) {
        if (user.getAge() >= MINIMUM_DRIVING_AGE) { /* ... */ }
        if (order.getStatus() == ORDER_STATUS_APPROVED) { /* ... */ }
    }

    // ─── Records — imutabilidade estrutural ───────────────────────────────────

    // ❌ Bad: classe mutável para transportar dados
    static class InvoiceDataBad {
        private String orderId;
        private String customerId;
        private BigDecimal amount;
        // getters e setters manuais, equals/hashCode verbosos
    }

    // ✅ Good: record elimina o boilerplate e garante imutabilidade
    record InvoiceData(String orderId, String customerId, BigDecimal amount, String currency) {}

    public void recordExample() {
        final var invoice = new InvoiceData("ord-1", "cust-99", new BigDecimal("149.90"), "BRL");
        final var orderId = invoice.orderId(); // getter gerado
    }

    // ─── var — inferência de tipo ─────────────────────────────────────────────

    // ❌ Bad: var obscurece o tipo
    public void varBad() {
        final var result = repository.fetch();  // qual é o tipo?
    }

    // ✅ Good: var quando o tipo é óbvio; tipo explícito quando agrega clareza
    public void varGood() {
        final var orders = orderRepository.findAll();             // List<Order> — óbvio
        final var user = new User("Alice", "alice@example.com");  // User — óbvio

        final Optional<User> found = userRepository.findById("u-1"); // tipo explícito agrega contexto
    }

    // ─── Primitivos vs wrappers ───────────────────────────────────────────────

    // ❌ Bad: wrapper desnecessário
    public void wrapperBad() {
        Integer count = 0;
        Boolean isActive = true;
        Long totalMs = 86_400_000L;
    }

    // ✅ Good: primitivo por padrão, wrapper só quando necessário
    public void wrapperGood() {
        int count = 0;
        boolean isActive = true;
        long totalMs = ONE_DAY_MS;

        final Map<String, Integer> scoreByUser = new HashMap<>();
    }
}
