import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GhlPaymentService } from './ghl-payment.service';
import { GhlPaymentWebhookDto } from './dto/ghl-payment-webhook.dto';

@ApiTags('GHL Webhook')
@Controller('webhook/ghl')
export class GhlWebhookController {
  constructor(private readonly ghlPaymentService: GhlPaymentService) {}

  @Get('payment')
  @ApiOperation({ summary: 'Verify GHL Payment webhook endpoint (GET request for validation)' })
  @ApiQuery({ name: 'challenge', required: false, description: 'Challenge parameter for webhook verification' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint verified', schema: { example: { success: true, message: 'Webhook endpoint is active' } } })
  async verifyPaymentWebhook(@Query('challenge') challenge?: string) {
    console.log("========== GHL Payment Webhook Verification (GET) ==========");
    console.log("Challenge:", challenge);
    
    // If GHL sends a challenge parameter, echo it back
    if (challenge) {
      return { challenge };
    }
    
    return {
      success: true,
      message: 'GHL Payment webhook endpoint is active',
      endpoint: '/api/webhook/ghl/payment',
      method: 'POST',
    };
  }

  @Post('payment')
  @ApiOperation({ summary: 'Receive Invoice Payment webhook from GoHighLevel (PUBLIC)' })
  @ApiBody({ type:GhlPaymentWebhookDto })
  @ApiResponse({ status:200, description:'Webhook processed successfully',schema:{ example:{success:true} }})
  @ApiResponse({ status:400, description:'Invalid payload or user not found'})
  async handlePayment(@Body() body:GhlPaymentWebhookDto){
    console.log("========== GHL Payment Webhook (POST) ==========");
    return this.ghlPaymentService.processInvoicePayment(body);
  }
}

