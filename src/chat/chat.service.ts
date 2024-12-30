import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import OpenAI from 'openai';
import { IChatRequest, IChatResponse } from 'src/interfaces/openai.interface';

@Injectable()
export class ChatService {
  private client : OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('Missing OpenAI API Key in environment variables');
    }
    this.client = new OpenAI({
      apiKey
    });
  }

  async getMessagesData(request: IChatRequest) {
    try {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        messages: [{ role: 'user', content: request.messages[0]?.content }],
        store: true,
        model: 'gpt-4o-mini',
      };
      const chatCompletion: OpenAI.Chat.ChatCompletion = await this.client.chat.completions.create(params);
      return chatCompletion
    } catch (error) {
      console.error('Error in getMessagesData:', error.response?.data || error.message);
      throw error;
    }
  }
  
  
  getChatOpenaiResponse(message: any): IChatResponse {
    return {
      success: true,
      result: message?.choices?.[0],
    };
  }
}
