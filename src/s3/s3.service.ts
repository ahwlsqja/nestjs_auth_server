import { Body, Injectable } from '@nestjs/common';
import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { envVariableKeys } from 'src/common/const/env.const';
import { env } from 'process';

@Injectable()
export class S3Service {
    s3Client: S3Client;

    constructor(private configService: ConfigService){
        this.s3Client=new S3Client({
            region: this.configService.get<string>(envVariableKeys.awsregion),
            credentials: {
                accessKeyId: this.configService.get<string>(envVariableKeys.awsaccesekey),
                secretAccessKey: this.configService.get<string>(envVariableKeys.awssecretaccesskey)
            },
        });
    }

    async uploadAud(objectName: string, audioData: Buffer){
        const params = {
            Bucket: this.configService.get<string>(envVariableKeys.awss3bucketname),
            Key: objectName,
            Body: audioData,
            ContentType: 'audio/wav',
        };

        const command = new PutObjectCommand(params);
        await this.s3Client.send(command)
    }
    async getLatestVersion(modelId: number){
        const params = {
            Bucket: this.configService.get<string>(envVariableKeys.awss3bucketname),
            Prefix: `${modelId}_version_`
        };

        const command = new ListObjectsV2Command(params)
        const data = await this.s3Client.send(command);

        const versions = data.Contents?.map(item => {
            const match = item.Key?.match(/version_(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }) || [];

        return versions.length > 0 ? Math.max(...versions) : 0; // 최신 버전 반환
    }
}
