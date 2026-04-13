// webhook.controller.ts

import { Controller, Post, Body } from '@nestjs/common';
import { ActivityLogService } from '../../common/services/activity-log.service';



@Controller('webhook') // Đường dẫn này phải khớp với lệnh CLI (--forward-to localhost:3000/webhook)

export class WebhookController {
  constructor(private readonly activityLogService: ActivityLogService) { }

  @Post()

  handleWebhook(@Body() event: any) {

    // Chỉ cần log ra để xem trước đã

    console.log('-------------------------------------------------');

    console.log('🔔 CÓ TIN NHẮN TỪ STRIPE:', event.type);



    // Test thử xem có bắt được sự kiện thành công không

    if (event.type === 'payment_intent.succeeded') {
      console.log('💰 -> TIỀN ĐÃ VỀ! (Update DB success)');
    }

    if (event.type === 'payment_intent.payment_failed') {
      console.log('❌ -> THANH TOÁN THẤT BẠI!');
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata || {};

      this.activityLogService.createActivityLog({
        userId: metadata.userId || 'system',
        action: 'PAYMENT_FAILURE',
        entity: 'Payment',
        entityId: paymentIntent.id,
        metadata: {
          error: paymentIntent.last_payment_error?.message,
          unitId: metadata.unitId,
          reservationId: metadata.reservationId
        }
      }).catch(err => console.error('Failed to log payment failure activity:', err));
    }



    return { received: true };

  }

}

