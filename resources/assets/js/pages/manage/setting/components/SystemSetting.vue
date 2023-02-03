<template>
    <div class="setting-component-item">
        <Form ref="formDatum" :model="formDatum" label-width="auto" @submit.native.prevent>
            <FormItem :label="$L('允許注册')" prop="reg">
                <RadioGroup v-model="formDatum.reg">
                    <Radio label="open">{{$L('允許')}}</Radio>
                    <Radio label="invite">{{$L('邀請碼')}}</Radio>
                    <Radio label="close">{{$L('禁止')}}</Radio>
                </RadioGroup>
                <div v-if="formDatum.reg == 'open'" class="form-tip">{{$L('允許：開放註冊功能。')}}</div>
                <template v-else-if="formDatum.reg == 'invite'">
                    <div class="form-tip">{{$L('邀請碼：註冊時需填寫下方邀請碼。')}}</div>
                    <Input v-model="formDatum.reg_invite" style="width:200px;margin-top:6px">
                        <span slot="prepend">{{$L('邀請碼')}}</span>
                    </Input>
                </template>
            </FormItem>
            <FormItem :label="$L('登錄驗證碼')" prop="loginCode">
                <RadioGroup v-model="formDatum.login_code">
                    <Radio label="auto">{{$L('自動')}}</Radio>
                    <Radio label="open">{{$L('')}}</Radio>
                    <Radio label="close">{{$L('關閉')}}</Radio>
                </RadioGroup>
                <div v-if="formDatum.login_code == 'auto'" class="form-tip">{{$L('自動：密碼輸入錯誤後必須添加驗證碼。')}}</div>
            </FormItem>
            <FormItem :label="$L('密碼策略')" prop="passwordPolicy">
                <RadioGroup v-model="formDatum.password_policy">
                    <Radio label="simple">{{$L('簡單')}}</Radio>
                    <Radio label="complex">{{$L('複雜')}}</Radio>
                </RadioGroup>
                <div v-if="formDatum.password_policy == 'simple'" class="form-tip">{{$L('簡單：大於或等於6個字母。')}}</div>
                <div v-else-if="formDatum.password_policy == 'complex'" class="form-tip">{{$L('複雜：大於或等於6個字母，包含數字、字母大小寫或者特殊字符。')}}</div>
            </FormItem>
            <FormItem :label="$L('邀請項目')" prop="projectInvite">
                <RadioGroup v-model="formDatum.project_invite">
                    <Radio label="open">{{$L('開啟')}}</Radio>
                    <Radio label="close">{{$L('關閉')}}</Radio>
                </RadioGroup>
                <div v-if="formDatum.project_invite == 'open'" class="form-tip">{{$L('開啟：項目管理員可生成連結邀請成員加入項目。')}}</div>
            </FormItem>
            <FormItem :label="$L('聊天暱稱')" prop="chatNickname">
                <RadioGroup v-model="formDatum.chat_nickname">
                    <Radio label="optional">{{$L('可選')}}</Radio>
                    <Radio label="required">{{$L('必填')}}</Radio>
                </RadioGroup>
                <div v-if="formDatum.chat_nickname == 'required'" class="form-tip">{{$L('必填：發送聊天内容前必須設置暱稱。')}}</div>
                <div v-else class="form-tip">{{$L('如果必填，發送聊天前必須設置暱稱。')}}</div>
            </FormItem>
            <FormItem :label="$L('自動歸檔任務')" prop="autoArchived">
                <RadioGroup :value="formDatum.auto_archived" @on-change="formArchived">
                    <Radio label="open">{{$L('開啟')}}</Radio>
                    <Radio label="close">{{$L('關閉')}}</Radio>
                </RadioGroup>
                <div class="form-tip">{{$L('任務完成後自動歸檔。')}}</div>
                <ETooltip v-if="formDatum.auto_archived=='open'" placement="right">
                    <div class="setting-auto-day">
                        <Input v-model="formDatum.archived_day" type="number">
                            <span slot="append">{{$L('天')}}</span>
                        </Input>
                    </div>
                    <div slot="content">{{$L('任務完成 % 天後自動歸檔。', formDatum.archived_day)}}</div>
                </ETooltip>
            </FormItem>
            <FormItem :label="$L('是否啟動首頁')" prop="startHome">
                <RadioGroup v-model="formDatum.start_home">
                    <Radio label="open">{{$L('開啟')}}</Radio>
                    <Radio label="close">{{$L('關閉')}}</Radio>
                </RadioGroup>
                <div class="form-tip">{{$L('僅支持網頁版。')}}</div>
                <Input
                    v-if="formDatum.start_home == 'open'"
                    v-model="formDatum.home_footer"
                    type="textarea"
                    style="margin:8px 0 -8px"
                    :rows="2"
                    :autosize="{ minRows: 2, maxRows: 8 }"
                    :placeholder="$L('首頁底部：首頁底部網站備案號等訊息')"/>
            </FormItem>
        </Form>
        <div class="setting-footer">
            <Button :loading="loadIng > 0" type="primary" @click="submitForm">{{$L('提交')}}</Button>
            <Button :loading="loadIng > 0" @click="resetForm" style="margin-left: 8px">{{$L('重置')}}</Button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'SystemSetting',

    data() {
        return {
            loadIng: 0,

            formDatum: {},
        }
    },

    mounted() {
        this.systemSetting();
    },

    methods: {
        submitForm() {
            this.$refs.formDatum.validate((valid) => {
                if (valid) {
                    this.systemSetting(true);
                }
            })
        },

        resetForm() {
            this.formDatum = $A.cloneJSON(this.formDatum_bak);
        },

        formArchived(value) {
            this.formDatum = { ...this.formDatum, auto_archived: value };
        },

        systemSetting(save) {
            this.loadIng++;
            this.$store.dispatch("call", {
                url: 'system/setting?type=' + (save ? 'save' : 'all'),
                data: this.formDatum,
            }).then(({data}) => {
                if (save) {
                    $A.messageSuccess('修改成功');
                }
                this.loadIng--;
                this.formDatum = data;
                this.formDatum_bak = $A.cloneJSON(this.formDatum);
            }).catch(({msg}) => {
                if (save) {
                    $A.modalError(msg);
                }
                this.loadIng--;
            });
        }
    }
}
</script>
