import { stdin, stdout } from 'node:process';
import { createAdminAccount } from '../lib/store';

function secretPrompt(label:string){
  const terminal=stdin as NodeJS.ReadStream;
  return new Promise<string>((resolve,reject)=>{
    let value='';stdout.write(label);terminal.setEncoding('utf8');terminal.setRawMode(true);terminal.resume();
    const finish=(error?:Error)=>{terminal.removeListener('data',onData);terminal.setRawMode(false);terminal.pause();stdout.write('\n');if(error)reject(error);else resolve(value);};
    const onData=(chunk:string)=>{for(const character of chunk){if(character==='\u0003'){finish(new Error('Đã hủy.'));return;}if(character==='\r'||character==='\n'){finish();return;}if(character==='\u007f'||character==='\b'){value=Array.from(value).slice(0,-1).join('');continue;}if(character>=' '&&character!=='\u007f')value+=character;}};
    terminal.on('data',onData);
  });
}
async function main(){
  if(!stdin.isTTY||!(stdin as NodeJS.ReadStream).setRawMode)throw new Error('Hãy chạy lệnh trong Terminal tương tác để nhập mật khẩu an toàn.');
  stdout.write('Tạo tài khoản quản lý admin@qlxd\n');
  const password=await secretPrompt('Nhập mật khẩu (tối thiểu 12 ký tự): ');
  const confirmation=await secretPrompt('Nhập lại mật khẩu: ');
  if(password!==confirmation) throw new Error('Hai mật khẩu chưa khớp.');
  createAdminAccount('admin@qlxd',password);
  stdout.write('Đã tạo tài khoản admin@qlxd. Hãy đăng nhập tại nút “Đăng nhập quản lý” trên phần mềm.\n');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Không tạo được tài khoản.');process.exitCode=1;});
