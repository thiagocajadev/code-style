package com.example.scripts.test;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

// Demonstra os princípios de testing.md:
// - AAA (Arrange, Act, Assert) com fases separadas por blank line
// - AssertJ para assertions expressivas
// - Mockito para isolamento de dependências
// - @Nested para agrupamento por contexto
// - Nomes de teste que documentam o comportamento

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private OrderService orderService;

    // ─── @Nested — agrupamento por contexto ──────────────────────────────────

    @Nested
    class WhenOrderExists {

        private Order existingOrder;

        @BeforeEach
        void setUp() {
            existingOrder = new Order("ord-1", "cust-99", new BigDecimal("100"));
            when(orderRepository.findById("ord-1")).thenReturn(Optional.of(existingOrder));
        }

        // ─── AAA explícito ────────────────────────────────────────────────────

        @Test
        void findsOrderById() {
            // Arrange — setup em @BeforeEach

            // Act
            final var actualOrder = orderService.findById("ord-1");

            // Assert
            assertThat(actualOrder.getId()).isEqualTo("ord-1");
            assertThat(actualOrder.getCustomerId()).isEqualTo("cust-99");
        }

        @Test
        void appliesDiscountWhenOrderQualifies() {
            existingOrder.setDiscountPct(10);

            final var actualOrder = orderService.applyDiscount(existingOrder);
            final var expectedTotal = new BigDecimal("90");

            assertThat(actualOrder.getTotal()).isEqualByComparingTo(expectedTotal);
        }

        @Test
        void notifiesCustomerAfterProcessing() {
            orderService.process("ord-1");

            verify(notificationService).notifyOrderProcessed(existingOrder);
        }
    }

    @Nested
    class WhenOrderDoesNotExist {

        @BeforeEach
        void setUp() {
            when(orderRepository.findById("ord-99")).thenReturn(Optional.empty());
        }

        @Test
        void throwsNotFoundExceptionWhenOrderDoesNotExist() {
            assertThatThrownBy(() -> orderService.findById("ord-99"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("ord-99");
        }

        @Test
        void doesNotSendNotificationWhenOrderDoesNotExist() {
            assertThatThrownBy(() -> orderService.process("ord-99"))
                .isInstanceOf(NotFoundException.class);

            verifyNoInteractions(notificationService);
        }
    }
}

// ─── DiscountServiceTest — AAA e assert semântico ─────────────────────────────

@ExtendWith(MockitoExtension.class)
class DiscountServiceTest {

    @InjectMocks
    private DiscountService discountService;

    private Order baseOrder;

    @BeforeEach
    void setUp() {
        baseOrder = new Order("ord-1", "cust-99", new BigDecimal("100"));
    }

    // ❌ Bad: fases misturadas, assertion colado ao setup
    @Test
    void appliesDiscountBad() {
        final var order = new Order("ord-1", new BigDecimal("100"), 10);
        final var result = discountService.apply(order);
        final var expectedPrice = new BigDecimal("90");
        assertThat(result.getTotal()).isEqualByComparingTo(expectedPrice);
    }

    // ✅ Good: AAA explícito, assertion como fase própria
    @Test
    void appliesTenPercentDiscount() {
        baseOrder.setDiscountPct(10);

        final var actualOrder = discountService.apply(baseOrder);
        final var expectedTotal = new BigDecimal("90");

        assertThat(actualOrder.getTotal()).isEqualByComparingTo(expectedTotal);
    }

    @Test
    void appliesZeroDiscountWhenPctIsZero() {
        baseOrder.setDiscountPct(0);

        final var actualOrder = discountService.apply(baseOrder);

        assertThat(actualOrder.getTotal()).isEqualByComparingTo(new BigDecimal("100"));
    }

    @Test
    void throwsWhenDiscountExceedsHundredPercent() {
        baseOrder.setDiscountPct(101);

        assertThatThrownBy(() -> discountService.apply(baseOrder))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("discount");
    }
}
