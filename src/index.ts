
class HookedPromise<T> extends Promise<T>{
    __taskId:string='';
    static task={
        status:{} as {[taskId:string]:{
            locals:{[key:string]:any},
            abortSignal:AbortSignal,
            abortController:AbortController;
        }},
        currentTask:'',
        getAbortSignal(taskId?:string){
            taskId=taskId??this.currentTask;
            if(taskId in this.status){
                return this.status[taskId].abortSignal;
            }
        },
        abort(taskId:string,reason?:any){
            if(taskId in this.status){
                this.status[taskId].abortController.abort(reason);
            }
        },
        create(taskId:string,taskMain:()=>Promise<void>){
            if(taskId in this.status){
                throw new Error('task is running.');
            }
            let abortController=new AbortController();
            this.status[taskId]={locals:{},abortSignal:abortController.signal,abortController};
            this.currentTask=taskId;
            const cleanup=()=>{
                delete this.status[taskId];
            }
            taskMain().then(cleanup).catch(cleanup);
            this.currentTask='';
        },
        locals(taskId?:string){
            taskId=taskId??this.currentTask;
            if(taskId in this.status){
                return this.status[taskId].locals
            }
        }
    }
    constructor(arg0:any){
        super(arg0);
        this.__taskId=task.currentTask;
    }
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2> {
        return super.then((value: T) => {
            task.currentTask=this.__taskId;
            try{
                task.getAbortSignal()?.throwIfAborted();
                if(typeof onfulfilled==='function'){
                    return onfulfilled(value);
                }else{
                    return value;
                }
            }catch(e:any){
                if(typeof onrejected==='function'){
                    return onrejected(e);
                }
            }
        },(reason: any) => {
            task.currentTask=this.__taskId;
            if(typeof onrejected==='function'){
                return onrejected(reason);
            }else{
                throw reason;
            }
        }) as any;
    }
}
if(!('task' in Promise)){
    (globalThis as any).__NativePromise=Promise;
    (globalThis as any).Promise=HookedPromise;
}

export let task=(Promise as any).task as typeof HookedPromise.task;
