export default function SettingField({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label htmlFor={htmlFor} className="sr-only">
                {label}
            </label>
            {children}
        </div>
    );
}
