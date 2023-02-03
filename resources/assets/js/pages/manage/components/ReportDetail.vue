<template>
    <div class="report-detail">
        <div class="report-title">{{ data.title }}</div>
        <div class="report-detail-context">
            <Form class="report-form" label-width="auto" inline>
                <FormItem :label="$L('匯報人')">
                    <UserAvatar :userid="data.userid" :size="28"/>
                </FormItem>
                <FormItem :label="$L('提交時間')">
                    {{ data.created_at }}
                </FormItem>
                <FormItem :label="$L('匯報對象')">
                    <UserAvatar v-for="(item, key) in data.receives_user" :key="key" :userid="item.userid" :size="28"/>
                </FormItem>
            </Form>
            <Form class="report-form" label-width="auto">
                <FormItem :label="$L('匯報内容')">
                    <div class="report-content" v-html="data.content"></div>
                </FormItem>
            </Form>
        </div>
    </div>
</template>

<script>
export default {
    name: "ReportDetail",
    props: {
        data: {
            default: {},
        }
    },
    watch: {
        'data.id': {
            handler(id) {
                if (id > 0) this.sendRead();
            },
            immediate: true
        },
    },
    methods: {
        sendRead() {
            this.$store.dispatch("call", {
                url: 'report/read',
                data: {
                    ids: [this.data.id]
                },
            }).then(() => {
                //
            }).catch(() => {
                //
            });
        },
    }
}
</script>
