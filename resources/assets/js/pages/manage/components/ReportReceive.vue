<template>
    <div class="report-list-wrap">
        <div class="search-container lr">
            <ul>
                <li>
                    <div class="search-label">
                        {{ $L("關鍵詞") }}
                    </div>
                    <div class="search-content">
                        <Input v-model="keys.key" :placeholder="$L('輸入關鍵詞搜索')" clearable/>
                    </div>
                </li>
                <li>
                    <div class="search-label">
                        {{ $L("匯報類型") }}
                    </div>
                    <div class="search-content">
                        <Select
                            v-model="keys.type"
                            :placeholder="$L('全部')">
                            <Option v-for="item in reportTypeList" :value="item.value" :key="item.value">{{ item.label }}</Option>
                        </Select>
                    </div>
                </li>
                <li>
                    <div class="search-label">
                        {{ $L("匯報時間") }}
                    </div>
                    <div class="search-content">
                        <DatePicker
                            v-model="keys.created_at"
                            type="daterange"
                            split-panels
                            :placeholder="$L('請選擇時間')"/>
                    </div>
                </li>
                <li class="search-button">
                    <Tooltip
                        theme="light"
                        placement="right"
                        transfer-class-name="search-button-clear"
                        transfer>
                        <Button :loading="loadIng > 0" type="primary" icon="ios-search" @click="onSearch">{{$L('搜索')}}</Button>
                        <div slot="content">
                            <Button v-if="keyIs" type="text" @click="keyIs=false">{{$L('取消篩選')}}</Button>
                            <Button v-else :loading="loadIng > 0" type="text" @click="getLists">{{$L('刷新')}}</Button>
                        </div>
                    </Tooltip>
                </li>
            </ul>
        </div>

        <div class="table-page-box">
            <Table
                :columns="columns"
                :data="lists"
                :loading="loadIng > 0"
                :no-data-text="$L(noDataText)"
                stripe/>
            <Page
                :total="listTotal"
                :current="listPage"
                :page-size="listPageSize"
                :disabled="loadIng > 0"
                :simple="windowMax768"
                :page-size-opts="[10,20,30,50,100]"
                show-elevator
                show-sizer
                show-total
                @on-change="setPage"
                @on-page-size-change="setPageSize"/>
        </div>
    </div>
</template>

<script>
import {mapState} from "vuex";

export default {
    name: "ReportReceive",
    data() {
        return {
            loadIng: 0,
            columns: [],
            lists: [],
            listPage: 1,
            listTotal: 0,
            listPageSize: 20,
            noDataText: "數據加载中.....",

            keys: {},
            keyIs: false,

            reportTypeList: [
                {value: "", label: this.$L('全部')},
                {value: "weekly", label: this.$L('周報')},
                {value: "daily", label: this.$L('日報')},
            ],
        }
    },
    mounted() {
        this.getLists();
    },
    computed: {
        ...mapState(['userId', 'windowMax768'])
    },
    watch: {
        keyIs(v) {
            if (!v) {
                this.keys = {}
                this.setPage(1)
            }
        }
    },
    methods: {
        initLanguage() {
            this.columns = [{
                title: this.$L("標題"),
                key: 'title',
                sortable: true,
                minWidth: 120,
                render: (h, {row}) => {
                    let arr = []
                    const myUser = row.receives_user.find(({userid}) => userid == this.userId)
                    if (myUser && myUser.pivot.read == 0) {
                        arr.push(
                            h('Tag', {
                                props: {   //传递参数
                                    color: "orange",
                                }
                            }, this.$L("未讀")),
                            h('span', row.title)
                        )
                    } else {
                        arr.push(
                            h('span', row.title)
                        )
                    }
                    return h('div', arr)
                }
            }, {
                title: this.$L("類型"),
                key: 'type',
                sortable: true,
                width: 90,
            }, {
                title: this.$L("接收時間"),
                key: 'receive_time',
                align: 'center',
                sortable: true,
                width: 180,
            }, {
                title: this.$L("操作"),
                align: 'center',
                width: 90,
                minWidth: 90,
                render: (h, {column, row}) => {
                    if (!row.id) {
                        return null;
                    }
                    return h('TableAction', {
                        props: {
                            column,
                            menu: [
                                {
                                    icon: "md-eye",
                                    action: "view",
                                }
                            ]
                        },
                        on: {
                            action: (name) => {
                                if (name === 'view') {
                                    this.$emit("on-view", row)
                                    const myUser = row.receives_user.find(({userid}) => userid == this.userId)
                                    if (myUser) {
                                        this.$set(myUser.pivot, 'read', 1)
                                    }
                                }
                            }
                        }
                    });
                },
            }];
        },

        onSearch() {
            this.listPage = 1;
            this.getLists();
        },

        getLists() {
            this.loadIng++;
            this.keyIs = $A.objImplode(this.keys) != "";
            this.$store.dispatch("call", {
                url: 'report/receive',
                data: {
                    keys: this.keys,
                    page: Math.max(this.listPage, 1),
                    pagesize: Math.max($A.runNum(this.listPageSize), 10),
                },
            }).then(({data}) => {
                // data 结果数据
                this.lists = data.data;
                this.listTotal = data.total;
                this.noDataText = "没有相關的數據";
                // msg 结果描述
            }).catch(({msg}) => {
                // msg 错误原因
                $A.messageError(msg);
                this.noDataText = '數據加载失敗';
            }).finally(() => {
                this.loadIng--;
            });
        },

        setPage(page) {
            this.listPage = page;
            this.getLists();
        },

        setPageSize(size) {
            if (Math.max($A.runNum(this.listPageSize), 10) !== size) {
                this.listPageSize = size;
                this.getLists();
            }
        },
    }
}
</script>
