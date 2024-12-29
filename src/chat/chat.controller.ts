import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatService } from './chat.service';
import { IChatRequest } from 'src/interfaces/openai.interface';


@Controller('openai')
export class ChatController {
  constructor(private openaiService: ChatService) {}

  @Post('/chat')
  // @UseGuards(JwtAuthenticationGuard)
  @HttpCode(200)
  async getChatOpenai(@Body() request: IChatRequest) {
    try {
      const getMessages = (await this.openaiService.getMessagesData(
        request,
      )) as OpenAI.ChatCompletion;
      console.log("==getMessages==", getMessages);
      return getMessages
    } catch (error) {
      console.error("Error in getChatOpenai:", error);
      throw error; // Rethrow để NestJS xử lý
    }
  }
}