import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, UseInterceptors, ParseIntPipe, UploadedFile } from '@nestjs/common';
import { ModelsService } from './models.service';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { RBAC } from 'src/auth/decorator/rbac.decorator';
import { CacheInterceptor as CI } from '@nestjs/cache-manager'
import { Role } from 'src/user/entities/user.entity';
import { UserId } from 'src/user/decorator/user-id.decorator';
import { MyModelDto } from './dto/my-model-find.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from 'src/s3/s3.service';

@Controller('models')
export class ModelsController {
  constructor(
    @Inject('ML_CRUD_QUEUE') private client: ClientProxy,
    @Inject('AUDIO_DATA_QUEUE') private client2: ClientProxy, // s3업로드 큐
    private s3Service: S3Service
  ) {}

@Post('uploadS3/:id')
@RBAC(Role.paidUser)
@UseInterceptors(FileInterceptor('file'))
async uploaddata(
  @Param('id', ParseIntPipe) id: number,
  @UploadedFile() file: Express.Multer.File,
) {
  const MAX_RETRIES = 3; // 최대 리트라이 횟수 설정
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      console.log(1);
      const modelExists = await this.client.send({ cmd: 'model_check' }, { modelId: id }).toPromise();
      console.log(1);
      console.log(modelExists);

      if (modelExists) {
        console.log(2);
        const version = await this.s3Service.getLatestVersion(id); // S3에서 최신 버전 조회
        const objectName = `${id}_version_${version + 1}.mp3`; // 객체 이름 설정
        await this.s3Service.uploadAud(objectName, file.buffer); // S3에 업로드

        this.client2.emit('audio_data_queue', { objectName, id})
        console.log('Event emitted:', { objectName, id });
        return { message: '파일이 성공적으로 업로드되었습니다.', objectName };
      } else {
        throw new Error('모델이 존재하지 않습니다.');
      }
      
    } catch (error) {
      attempt++;
      console.error(`업로드 중 오류 발생 (시도 ${attempt}):`, error);

      console.log(error)
      // 특정 에러 메시지인지 확인
      if (error === "There is no matching message handler defined in the remote service.") {
        if (attempt < MAX_RETRIES) {
          console.log('재시도 중...');
          // 잠시 대기 후 재시도
          await new Promise(res => setTimeout(res, 1000)); // 1초 대기
          continue; // 다음 시도로 넘어감
        } else {
          throw new Error(`업로드 중 오류가 발생했습니다: ${error.message}`);
        }
      } else {
        // 다른 오류는 바로 처리
        throw new Error(`업로드 중 오류가 발생했습니다: ${error.message}`);
      }
    }
  }
}


  //////////////////// 모델 생성 //////////////////////////
  @Post()
  @RBAC(Role.paidUser)
  async createModel(
    @Body() createModelDto: CreateModelDto,
    @UserId() userId: number,
  ) {
    const MAX_RETRIES = 3; // 최대 리트라이 횟수 설정
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {

    createModelDto.userId = userId;
    return await this.client.send({ cmd: 'create_model'}, createModelDto).toPromise()
  } catch (error) {
    attempt++;
    console.error(`생성 중 오류 발생 (시도 ${attempt}):`, error);

    // 특정 에러 메시지인지 확인
    if (error === "There is no matching message handler defined in the remote service.") {
      if (attempt < MAX_RETRIES) {
        console.log('재시도 중...');
        // 잠시 대기 후 재시도
        await new Promise(res => setTimeout(res, 1000)); // 1초 대기
        continue; // 다음 시도로 넘어감
      } else {
        throw new Error(`생성 중 오류가 발생했습니다: ${error.message}`);
      }
    } else {
      // 다른 오류는 바로 처리
      throw new Error(`생성 중 오류가 발생했습니다: ${error.message}`);
    }
  }
  }
}

  @MessagePattern('model_created')
  async handleModelCreated(data: any){
    console.log('모델이 생성되었습니다.', data)
  }

  @MessagePattern('model_creation_error')
  async handleModelCreationError(data: any){
    console.log('모델 생성 중 오류가 발생하였습니다.', data.error)
  }
  //////////////////////////////////////////////


  // 모든 모델 조회  //////////////////////////////////////////////
  @RBAC(Role.paidUser)
  @UseInterceptors(CI)
  @Get('recent')
  async findAll() {
    const MAX_RETRIES = 3; // 최대 리트라이 횟수 설정
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {

    return await this.client.send({ cmd: 'recent_model'}, {}).toPromise()
  } catch (error) {
    attempt++;
    console.error(`조회 중 오류 발생 (시도 ${attempt}):`, error);

    // 특정 에러 메시지인지 확인
    if (error === "There is no matching message handler defined in the remote service.") {
      if (attempt < MAX_RETRIES) {
        console.log('재시도 중...');
        // 잠시 대기 후 재시도
        await new Promise(res => setTimeout(res, 1000)); // 1초 대기
        continue; // 다음 시도로 넘어감
      } else {
        throw new Error(`조회 중 오류가 발생했습니다: ${error.message}`);
      }
    } else {
      // 다른 오류는 바로 처리
      throw new Error(`조회 중 오류가 발생했습니다: ${error.message}`);
    }
  }
  }
  }

  @MessagePattern('model_findRecent')
  async handleModelFindRecent(data: any){
    console.log('최근 모델을 불러왔습니다.', data)
  }

  @MessagePattern('model_findRecent_error')
  async handleModelFindRecentError(data: any){
    console.log('최근 모델을 불러오던 중 오류가 발생했습니다.', data.error)
  }
  //////////////////////////////////////////////



  /////////////////// 내 모델 조회 ///////////////////////////
  @Get()
  @RBAC(Role.paidUser)
  async getModel(@UserId() userId: number) {
    const MAX_RETRIES = 3; // 최대 리트라이 횟수 설정
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
    return await this.client.send({ cmd: 'get_my_model' }, { userId }).toPromise()
  } catch (error) {
    attempt++;
    console.error(`조회 중 오류 발생 (시도 ${attempt}):`, error);

    // 특정 에러 메시지인지 확인
    if (error === "There is no matching message handler defined in the remote service.") {
      if (attempt < MAX_RETRIES) {
        console.log('재시도 중...');
        // 잠시 대기 후 재시도
        await new Promise(res => setTimeout(res, 1000)); // 1초 대기
        continue; // 다음 시도로 넘어감
      } else {
        throw new Error(`조회 중 오류가 발생했습니다: ${error.message}`);
      }
    } else {
      // 다른 오류는 바로 처리
      throw new Error(`조회 중 오류가 발생했습니다: ${error.message}`);
    }
  }
  }
  }

  @MessagePattern('my_model_find')
  async handleMyModelFind(data: any){
    console.log('내 모델을 불러왔습니다.', data)
  }

  @MessagePattern('my_model_find_error')
  async handleMyModelFindError(data: any){
    console.log('내 모델을 불러오던 중 오류가 발생했습니다.', data.error)
  }
  //////////////////////////////////////////////

  //////////////////// 내 특정 모델 조회 ////////////////////////
  @Get(':id')
  @RBAC(Role.paidUser)
  async getmyModelOne(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: number,
  ){
    const MAX_RETRIES = 3; // 최대 리트라이 횟수 설정
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
    return await this.client.send({ cmd: 'get_my_model_one' }, { id }).toPromise()
  } catch (error) {
    attempt++;
    console.error(`조회 중 오류 발생 (시도 ${attempt}):`, error);

    // 특정 에러 메시지인지 확인
    if (error === "There is no matching message handler defined in the remote service.") {
      if (attempt < MAX_RETRIES) {
        console.log('재시도 중...');
        // 잠시 대기 후 재시도
        await new Promise(res => setTimeout(res, 1000)); // 1초 대기
        continue; // 다음 시도로 넘어감
      } else {
        throw new Error(`조회 중 오류가 발생했습니다: ${error.message}`);
      }
    } else {
      // 다른 오류는 바로 처리
      throw new Error(`조회 중 오류가 발생했습니다: ${error.message}`);
    }
  }
  }
  }


  @MessagePattern('model_one_get')
  async handleMyModelOneFind(data: any){
    console.log('모델을 불러왔습니다.', data)
  }

  @MessagePattern('model_one_get_error')
  async handleMyModelOneFindError(data: any){
    console.log('모델을 불러오던 중 오류가 발생했습니다.', data.error)
  }
  //////////////////////////////////////////////

  //////////////////// 내 모델 수정 ////////////////////////
  @Patch(':id')
  @RBAC(Role.paidUser)
  async updateModel(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateModelDto: UpdateModelDto) {
      const MAX_RETRIES = 3; // 최대 리트라이 횟수 설정
      let attempt = 0;
      updateModelDto.id = id
      while (attempt < MAX_RETRIES) {
        try {
        console.log(updateModelDto)

      return await this.client.send({ cmd: 'update_model' }, { updateModelDto }).toPromise()
    } catch (error) {
      attempt++;
      console.error(`수정 중 오류 발생 (시도 ${attempt}):`, error);

      // 특정 에러 메시지인지 확인
      if (error === "There is no matching message handler defined in the remote service.") {
        if (attempt < MAX_RETRIES) {
          console.log('재시도 중...');
          // 잠시 대기 후 재시도
          await new Promise(res => setTimeout(res, 1000)); // 1초 대기
          continue; // 다음 시도로 넘어감
        } else {
          throw new Error(`수정 중 오류가 발생했습니다: ${error.message}`);
        }
      } else {
        // 다른 오류는 바로 처리
        throw new Error(`수정 중 오류가 발생했습니다: ${error.message}`);
      }
    }
  }
  }

  @MessagePattern('updated_model')
  async handleUpdate(data: any){
    console.log('모델 정보를 업데이트 했습니다.', data)
  }

  @MessagePattern('update_model_error')
  async handleUpdateError(data: any){
    console.log('모델을 정보를 불러오던중 오류가 발생했습니다.', data.error)
  }


  //////////////////////////////////////////////
  
  @Delete(':id')
  @RBAC(Role.paidUser)
  async deleteModel(
    @Param('id', ParseIntPipe) id: number) {
      const MAX_RETRIES = 3; // 최대 리트라이 횟수 설정
      let attempt = 0;
      while (attempt < MAX_RETRIES) {
        try{

  
    return await this.client.send({ cmd: 'delete_model' }, { id }).toPromise()
      } catch (error) {
      attempt++;
      console.error(`삭제 중 오류 발생 (시도 ${attempt}):`, error);
      
      console.log(error)
      // 특정 에러 메시지인지 확인
      if (error === "There is no matching message handler defined in the remote service.") {
        if (attempt < MAX_RETRIES) {
          console.log('재시도 중...');
          // 잠시 대기 후 재시도
          await new Promise(res => setTimeout(res, 1000)); // 1초 대기
          continue; // 다음 시도로 넘어감
        } else {
          throw new Error(`삭제 중 오류가 발생했습니다: ${error.message}`);
        }
      } else {
        // 다른 오류는 바로 처리
        throw new Error(`삭제 중 오류가 발생했습니다: ${error.message}`);
      }
  }
}
  }


  @MessagePattern('deleted_model')
  async handleDelete(data: any){
    console.log('모델을 삭제했습니다.', data)
  }

  @MessagePattern('deleted_model_error')
  async handleDeleteError(data: any){
    console.log('모델을 삭제하던중 오류가 발생했습니다.', data.error)
  }
  

}
