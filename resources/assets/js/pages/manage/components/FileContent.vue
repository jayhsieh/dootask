<template>
    <div v-if="ready" class="file-content">
        <iframe v-if="isPreview" ref="myPreview" class="preview-iframe" :src="previewUrl"></iframe>
        <template v-else>
            <div v-show="!['word', 'excel', 'ppt'].includes(file.type)" class="edit-header">
                <div class="header-title">
                    <EPopover v-if="!equalContent" v-model="unsaveTip" class="file-unsave-tip">
                        <div class="task-detail-delete-file-popover">
                            <p>{{$L('未保存當前修改内容？')}}</p>
                            <div class="buttons">
                                <Button size="small" type="text" @click="unSaveGive">{{$L('放棄')}}</Button>
                                <Button size="small" type="primary" @click="onSaveSave">{{$L('保存')}}</Button>
                            </div>
                        </div>
                        <span slot="reference">[{{$L('未保存')}}*]</span>
                    </EPopover>
                    {{formatName(file)}}
                </div>
                <div class="header-user">
                    <ul>
                        <li v-for="(userid, index) in editUser" :key="index" v-if="index <= 10">
                            <UserAvatar :userid="userid" :size="28" :border-witdh="2"/>
                        </li>
                        <li v-if="editUser.length > 10" class="more">{{editUser.length > 99 ? '99+' : editUser.length}}</li>
                    </ul>
                </div>
                <div v-if="file.type=='document' && contentDetail" class="header-hint">
                    <ButtonGroup size="small" shape="circle">
                        <Button :type="`${contentDetail.type=='md'?'primary':'default'}`" @click="$set(contentDetail, 'type', 'md')">{{$L('MD編輯器')}}</Button>
                        <Button :type="`${contentDetail.type!='md'?'primary':'default'}`" @click="$set(contentDetail, 'type', 'text')">{{$L('文本編輯器')}}</Button>
                    </ButtonGroup>
                </div>
                <div v-if="file.type=='mind'" class="header-hint">
                    {{$L('選中節點，按enter鍵添加同級節點，tab鍵添加子節點')}}
                </div>
                <Dropdown v-if="file.type=='mind'"
                          trigger="click"
                          class="header-hint"
                          @on-click="exportMenu">
                    <a href="javascript:void(0)">{{$L('匯出')}}<Icon type="ios-arrow-down"></Icon></a>
                    <DropdownMenu slot="list">
                        <DropdownItem name="png">{{$L('匯出PNG圖片')}}</DropdownItem>
                        <DropdownItem name="pdf">{{$L('匯出PDF文件')}}</DropdownItem>
                    </DropdownMenu>
                </Dropdown>
                <Button v-if="!file.only_view" :disabled="equalContent" :loading="loadIng > 0" class="header-button" size="small" type="primary" @click="handleClick('save')">{{$L('保存')}}</Button>
            </div>
            <div v-if="contentDetail" class="content-body">
                <template v-if="file.type=='document'">
                    <MDEditor v-if="contentDetail.type=='md'" v-model="contentDetail.content" height="100%"/>
                    <TEditor v-else v-model="contentDetail.content" height="100%" @editorSave="handleClick('saveBefore')"/>
                </template>
                <Drawio v-else-if="file.type=='drawio'" ref="myFlow" v-model="contentDetail" :title="file.name" @saveData="handleClick('saveBefore')"/>
                <Minder v-else-if="file.type=='mind'" ref="myMind" v-model="contentDetail" @saveData="handleClick('saveBefore')"/>
                <AceEditor v-else-if="['code', 'txt'].includes(file.type)" v-model="contentDetail" :ext="file.ext" @saveData="handleClick('saveBefore')"/>
                <OnlyOffice v-else-if="['word', 'excel', 'ppt'].includes(file.type)" v-model="contentDetail" :documentKey="documentKey"/>
            </div>
        </template>
        <div v-if="contentLoad" class="content-load"><Loading/></div>
    </div>
</template>

<script>
import Vue from 'vue'
import Minder from '../../../components/Minder'
import {mapState} from "vuex";
Vue.use(Minder)

const MDEditor = () => import('../../../components/MDEditor/index');
const TEditor = () => import('../../../components/TEditor');
const AceEditor = () => import('../../../components/AceEditor');
const OnlyOffice = () => import('../../../components/OnlyOffice');
const Drawio = () => import('../../../components/Drawio');

export default {
    name: "FileContent",
    components: {AceEditor, TEditor, MDEditor, OnlyOffice, Drawio},
    props: {
        value: {
            type: Boolean,
            default: false
        },
        file: {
            type: Object,
            default: () => {
                return {};
            }
        },
    },

    data() {
        return {
            ready: false,

            loadContent: 0,
            loadIng: 0,

            fileId: 0,

            unsaveTip: false,

            contentDetail: null,
            contentBak: {},

            editUser: [],

            loadPreview: true,
        }
    },

    mounted() {
        document.addEventListener('keydown', this.keySave)
        window.addEventListener('message', this.handleMessage)
        //
        if (this.$isSubElectron) {
            window.__onBeforeUnload = () => {
                if (!this.equalContent) {
                    $A.modalConfirm({
                        content: '修改的内容尚未保存，真的要放棄修改嗎？',
                        cancelText: '取消',
                        okText: '放棄',
                        onOk: () => {
                            this.$Electron.sendMessage('windowDestroy');
                        }
                    });
                    return true
                }
            }
            this.$store.dispatch("websocketConnection")
        }
    },

    beforeDestroy() {
        document.removeEventListener('keydown', this.keySave)
        window.removeEventListener('message', this.handleMessage)
    },

    watch: {
        file: {
            handler(info) {
                if (this.fileId != info.id) {
                    this.fileId = info.id;
                    this.contentDetail = null;
                    this.getContent();
                }
            },
            immediate: true,
            deep: true,
        },

        value: {
            handler(val) {
                if (val) {
                    this.ready = true;
                    this.editUser = [this.userId];
                } else {
                    this.fileContent[this.fileId] = this.contentDetail;
                }
            },
            immediate: true,
        },

        wsMsg: {
            handler(info) {
                const {type, data} = info;
                switch (type) {
                    case 'path':
                        if (data.path == 'file/content/' + this.fileId) {
                            this.editUser = data.userids;
                        }
                        break;

                    case 'file':
                        if (data.action == 'content') {
                            if (this.value && data.id == this.fileId) {
                                $A.modalConfirm({
                                    title: "更新提示",
                                    content: '團隊成員（' + info.nickname + '）更新了内容，<br/>更新時間：' + $A.formatDate("Y-m-d H:i:s", info.time) + '。<br/><br/>點擊【確定】加載最新内容。',
                                    onOk: () => {
                                        this.getContent();
                                    }
                                });
                            }
                        }
                        break;
                }
            },
            deep: true,
        },

        wsOpenNum() {
            if (this.$isSubElectron) {
                this.$store.dispatch("websocketPath", "file/content/" + this.fileId);
            }
        },
    },

    computed: {
        ...mapState(['fileContent', 'wsMsg', 'userId', 'wsOpenNum']),

        equalContent() {
            return this.contentBak == $A.jsonStringify(this.contentDetail);
        },

        contentLoad() {
            return this.loadContent > 0 || this.previewLoad;
        },

        isPreview() {
            return this.contentDetail && this.contentDetail.preview === true;
        },

        previewLoad() {
            return this.isPreview && this.loadPreview === true;
        },

        previewUrl() {
            if (this.isPreview) {
                return $A.apiUrl("../fileview/onlinePreview?url=" + encodeURIComponent(this.contentDetail.url))
            } else {
                return '';
            }
        },
    },

    methods: {
        handleMessage (event) {
            const data = event.data;
            switch (data.act) {
                case 'ready':
                    this.loadPreview = false;
                    break
            }
        },

        keySave(e) {
            if (this.value && e.keyCode === 83) {
                if (e.metaKey || e.ctrlKey) {
                    e.preventDefault();
                    this.onSaveSave();
                }
            }
        },

        getContent() {
            if (!this.fileId) {
                this.contentDetail = {};
                this.updateBak();
                return;
            }
            if (typeof this.fileContent[this.fileId] !== "undefined") {
                this.contentDetail = this.fileContent[this.fileId];
                this.updateBak();
                return;
            }
            if (['word', 'excel', 'ppt'].includes(this.file.type)) {
                this.contentDetail = $A.cloneJSON(this.file);
                this.updateBak();
                return;
            }
            this.loadIng++;
            this.loadContent++;
            this.$store.dispatch("call", {
                url: 'file/content',
                data: {
                    id: this.fileId,
                },
            }).then(({data}) => {
                this.loadIng--;
                this.loadContent--;
                this.contentDetail = data.content;
                this.updateBak();
            }).catch(({msg}) => {
                $A.modalError(msg);
                this.loadIng--;
                this.loadContent--;
            })
        },

        updateBak() {
            this.contentBak = $A.jsonStringify(this.contentDetail);
        },

        handleClick(act) {
            switch (act) {
                case "saveBefore":
                    if (!this.equalContent && this.loadIng == 0) {
                        this.handleClick('save');
                    } else {
                        $A.messageWarning('没有任何修改！');
                    }
                    return;

                case "save":
                    if (this.file.only_view) {
                        return;
                    }
                    this.updateBak();
                    this.loadIng++;
                    this.$store.dispatch("call", {
                        url: 'file/content/save',
                        method: 'post',
                        data: {
                            id: this.fileId,
                            content: this.contentBak
                        },
                    }).then(({data, msg}) => {
                        $A.messageSuccess(msg);
                        this.loadIng--;
                        this.$store.dispatch("saveFile", {
                            id: this.fileId,
                            size: data.size,
                        });
                    }).catch(({msg}) => {
                        $A.modalError(msg);
                        this.loadIng--;
                        this.getContent();
                    })
                    break;
            }
        },

        exportMenu(act) {
            switch (this.file.type) {
                case 'mind':
                    this.$refs.myMind.exportHandle(act == 'pdf' ? 1 : 0, this.file.name);
                    break;
            }
        },

        unSaveGive() {
            delete this.fileContent[this.fileId];
            this.getContent();
            this.unsaveTip = false;
        },

        onSaveSave() {
            this.handleClick('save');
            this.unsaveTip = false;
        },

        documentKey() {
            return new Promise(resolve => {
                this.$store.dispatch("call", {
                    url: 'file/content',
                    data: {
                        id: this.fileId,
                        only_update_at: 'yes'
                    },
                }).then(({data}) => {
                    resolve($A.Date(data.update_at, true))
                }).catch(() => {
                    resolve(0)
                });
            })
        },

        formatName(file) {
            let {name, ext} = file;
            if (ext != '') {
                name += "." + ext;
            }
            return name;
        },
    }
}
</script>
